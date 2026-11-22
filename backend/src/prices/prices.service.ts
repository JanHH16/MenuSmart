import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Not, Repository } from 'typeorm';
import { PythonClientService } from '../python-client/python-client.service';
import { ScrapedProduct, Tienda, TIENDAS } from '../python-client/scrape.types';
import { Calidad, calcularCalidad } from './calidad';
import { CATALOGO, TERMINOS, categoriaDeTermino } from './catalogo';
import { ComparacionPrecios, FilaPrecio, construirComparacion } from './compare';
import { EjecucionScraping, ErrorEjecucion } from './entities/ejecucion-scraping.entity';
import {
  SQL_COBERTURA,
  SQL_PRECIOS_VIGENTES,
  SQL_ULTIMAS_EXITOSAS,
  SQL_UPSERT_PRECIOS,
  SQL_UPSERT_PRODUCTOS,
} from './prices.sql';

/** Una corrida "en curso" más vieja que esto se considera abandonada (ej. el servidor se reinició). */
const EN_CURSO_MAX_MS = 15 * 60 * 1000;
const MAX_ERRORES_GUARDADOS = 100;
const MAX_RESULTADOS_POR_CONSULTA = 40;

interface Acumulado {
  consultasTotal: number;
  consultasOk: number;
  consultasFallidas: number;
  extraidos: number;
  validos: number;
  duplicados: number;
  descartados: number;
  descartes: Record<string, number>;
  errores: ErrorEjecucion[];
}

export interface ComparacionRespuesta extends ComparacionPrecios {
  generadoEn: string;
  horasParaObsoleto: number;
  ultimaActualizacion: Record<Tienda, string | null>;
}

function mensajeDe(error: unknown): string {
  let texto: string;
  if (error instanceof HttpException) {
    const respuesta = error.getResponse();
    texto = typeof respuesta === 'string' ? respuesta : JSON.stringify(respuesta);
  } else {
    texto = error instanceof Error ? error.message : String(error);
  }
  return texto.slice(0, 300);
}

function trocear<T>(elementos: readonly T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) {
    lotes.push(elementos.slice(i, i + tamano));
  }
  return lotes;
}

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private trabajoActual: Promise<void> = Promise.resolve();

  constructor(
    @InjectRepository(EjecucionScraping)
    private readonly ejecuciones: Repository<EjecucionScraping>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly python: PythonClientService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Crea una corrida por tienda y las ejecuta en segundo plano: recorrer el catálogo toma
   * más de un minuto, así que el cliente consulta el avance con GET /prices/runs/:id.
   */
  async iniciarActualizacion(tiendas: Tienda[] = [...TIENDAS]): Promise<EjecucionScraping[]> {
    await this.verificarQuePuedeActualizar(tiendas);

    const corridas: EjecucionScraping[] = [];
    for (const tienda of tiendas) {
      corridas.push(
        await this.ejecuciones.save(
          this.ejecuciones.create({
            tienda,
            estado: 'en_curso',
            iniciadaEn: new Date(),
            finalizadaEn: null,
            consultasTotal: 0,
            consultasOk: 0,
            consultasFallidas: 0,
            registrosExtraidos: 0,
            registrosValidos: 0,
            registrosDuplicados: 0,
            registrosDescartados: 0,
            descartesPorMotivo: {},
            errores: [],
            duracionMs: null,
          }),
        ),
      );
    }

    this.trabajoActual = this.trabajoActual.then(() => this.ejecutarEnSegundoPlano(corridas));
    return corridas;
  }

  /** Espera a que termine la actualización en curso (útil en tests y al apagar el servidor). */
  async esperarActualizacion(): Promise<void> {
    await this.trabajoActual;
  }

  async obtenerEjecucion(id: string): Promise<EjecucionScraping> {
    const ejecucion = await this.ejecuciones.findOneBy({ id });
    if (!ejecucion) throw new NotFoundException('No existe esa ejecución.');
    return ejecucion;
  }

  listarEjecuciones(limite = 10): Promise<EjecucionScraping[]> {
    return this.ejecuciones.find({ order: { iniciadaEn: 'DESC' }, take: limite });
  }

  /**
   * Último precio conocido de cada producto en cada tienda para los términos pedidos, junto con
   * cuándo se actualizó cada tienda por última vez y el límite para considerarlo desactualizado.
   */
  async preciosVigentes(terminos: string[]): Promise<{
    filas: FilaPrecio[];
    ahora: Date;
    horasParaObsoleto: number;
    ultimaActualizacion: Record<Tienda, string | null>;
  }> {
    const filas = await this.dataSource.query<FilaPrecio[]>(SQL_PRECIOS_VIGENTES, [terminos]);
    const exitosas = await this.dataSource.query<{ tienda: Tienda; finalizadaEn: Date }[]>(
      SQL_ULTIMAS_EXITOSAS,
    );
    const ultimaActualizacion = Object.fromEntries(
      TIENDAS.map((tienda) => [
        tienda,
        exitosas.find((fila) => fila.tienda === tienda)?.finalizadaEn.toISOString() ?? null,
      ]),
    ) as Record<Tienda, string | null>;
    return { filas, ahora: new Date(), horasParaObsoleto: this.horasParaObsoleto, ultimaActualizacion };
  }

  async comparar(terminos?: string[], limiteComunes = 20): Promise<ComparacionRespuesta> {
    const pedidos = terminos?.length ? terminos : [...TERMINOS];
    const { filas, ahora, horasParaObsoleto, ultimaActualizacion } =
      await this.preciosVigentes(pedidos);
    const comparacion = construirComparacion(filas, pedidos, ahora, horasParaObsoleto, limiteComunes);

    return {
      generadoEn: ahora.toISOString(),
      horasParaObsoleto,
      ultimaActualizacion,
      ...comparacion,
    };
  }

  async calidad(): Promise<Calidad> {
    const ahora = new Date();
    const corridas = await this.ejecuciones.find({
      where: { estado: Not('en_curso') },
      order: { iniciadaEn: 'DESC' },
      take: 60,
    });
    const desde = new Date(ahora.getTime() - this.horasParaObsoleto * 3_600_000);
    const filas = await this.dataSource.query<{ supermercado: Tienda; consulta: string }[]>(
      SQL_COBERTURA,
      [desde.toISOString()],
    );
    const conPrecio: Record<Tienda, Set<string>> = {
      jumbo: new Set<string>(),
      santa_isabel: new Set<string>(),
    };
    for (const fila of filas) {
      conPrecio[fila.supermercado]?.add(fila.consulta);
    }
    return calcularCalidad(corridas, conPrecio, CATALOGO.length, ahora);
  }

  private async verificarQuePuedeActualizar(tiendas: Tienda[]): Promise<void> {
    const ahora = Date.now();

    const enCurso = await this.ejecuciones.find({
      where: {
        tienda: In(tiendas),
        estado: 'en_curso',
        iniciadaEn: MoreThan(new Date(ahora - EN_CURSO_MAX_MS)),
      },
      take: 1,
    });
    if (enCurso.length > 0) {
      throw new ConflictException('Ya hay una actualización de precios en curso.');
    }

    const minimoMs = this.numero('PRICES_MIN_REFRESH_INTERVAL_MINUTES', 10) * 60_000;
    if (minimoMs <= 0) return;
    const [reciente] = await this.ejecuciones.find({
      where: {
        tienda: In(tiendas),
        estado: In(['ok', 'parcial']),
        finalizadaEn: MoreThan(new Date(ahora - minimoMs)),
      },
      order: { finalizadaEn: 'DESC' },
      take: 1,
    });
    if (reciente?.finalizadaEn) {
      const espera = Math.ceil((reciente.finalizadaEn.getTime() + minimoMs - ahora) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Los precios se actualizaron hace poco. Intenta de nuevo en ${espera} segundos.`,
          retryAfterSeconds: espera,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async ejecutarEnSegundoPlano(corridas: EjecucionScraping[]): Promise<void> {
    await Promise.all(
      corridas.map((corrida) =>
        this.ejecutarTienda(corrida).catch((error: unknown) => {
          this.logger.error(`La corrida ${corrida.id} falló de forma inesperada: ${mensajeDe(error)}`);
        }),
      ),
    );
  }

  private async ejecutarTienda(corrida: EjecucionScraping): Promise<void> {
    const tienda = corrida.tienda as Tienda;
    const inicio = Date.now();
    const acumulado: Acumulado = {
      consultasTotal: 0,
      consultasOk: 0,
      consultasFallidas: 0,
      extraidos: 0,
      validos: 0,
      duplicados: 0,
      descartados: 0,
      descartes: {},
      errores: [],
    };
    const vistos = new Set<string>();
    const tamanoLote = Math.min(10, Math.max(1, this.numero('SCRAPER_BATCH_SIZE', 5)));

    try {
      for (const lote of trocear(TERMINOS, tamanoLote)) {
        acumulado.consultasTotal += lote.length;
        try {
          const { response, invalidos } = await this.python.scrapeSearch(
            { tienda, consultas: lote, max_resultados_por_consulta: MAX_RESULTADOS_POR_CONSULTA },
            {
              timeoutMs: this.numero('SCRAPER_BATCH_TIMEOUT_MS', 120_000),
              retryDelayMs: this.numero('SCRAPER_RETRY_DELAY_MS', 1000),
            },
          );

          // Un mismo producto puede aparecer en consultas de lotes distintos.
          const nuevos = response.resultados.filter((producto) => {
            if (vistos.has(producto.external_id)) return false;
            vistos.add(producto.external_id);
            return true;
          });
          if (nuevos.length > 0) {
            await this.persistirLote(tienda, nuevos, new Date(response.obtenido_en), corrida.id);
          }

          const estadisticas = response.estadisticas;
          acumulado.consultasOk += estadisticas.consultas_ok;
          acumulado.consultasFallidas += estadisticas.consultas_fallidas;
          acumulado.extraidos += estadisticas.registros_extraidos;
          acumulado.validos += nuevos.length;
          acumulado.duplicados +=
            estadisticas.registros_duplicados + (response.resultados.length - nuevos.length);
          acumulado.descartados += estadisticas.registros_descartados + invalidos;
          for (const [motivo, cantidad] of Object.entries(estadisticas.descartes_por_motivo)) {
            acumulado.descartes[motivo] = (acumulado.descartes[motivo] ?? 0) + cantidad;
          }
          if (invalidos > 0) {
            acumulado.descartes.respuesta_invalida =
              (acumulado.descartes.respuesta_invalida ?? 0) + invalidos;
          }
          acumulado.errores.push(...response.errores);
        } catch (error) {
          acumulado.consultasFallidas += lote.length;
          acumulado.errores.push({
            consulta: null,
            tipo: 'servicio_python',
            detalle: `${mensajeDe(error)} (consultas: ${lote.join(', ')})`,
          });
        }
      }
    } finally {
      await this.finalizar(corrida, acumulado, Date.now() - inicio);
    }
  }

  private async persistirLote(
    tienda: Tienda,
    productos: ScrapedProduct[],
    obtenidoEn: Date,
    ejecucionId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const guardados = await manager.query<{ id: string; slug: string }[]>(SQL_UPSERT_PRODUCTOS, [
        productos.map((p) => p.external_id),
        productos.map((p) => p.nombre_normalizado),
        productos.map((p) => p.nombre),
        productos.map((p) => p.marca),
        productos.map((p) => categoriaDeTermino(p.consulta)),
        productos.map((p) => p.imagen),
        productos.map((p) => p.cantidad),
        productos.map((p) => p.unidad),
      ]);
      const idPorSlug = new Map(guardados.map((fila) => [fila.slug, fila.id]));
      const conId = productos.filter((p) => idPorSlug.has(p.external_id));

      await manager.query(SQL_UPSERT_PRECIOS, [
        conId.map((p) => idPorSlug.get(p.external_id)),
        tienda,
        obtenidoEn.toISOString(),
        obtenidoEn.toISOString().slice(0, 10),
        ejecucionId,
        conId.map((p) => p.precio),
        conId.map((p) => p.consulta),
        conId.map((p) => p.precio_unitario),
        conId.map((p) => p.disponible),
        conId.map((p) => p.url),
      ]);
    });
  }

  private async finalizar(
    corrida: EjecucionScraping,
    acumulado: Acumulado,
    duracionMs: number,
  ): Promise<void> {
    let estado: 'ok' | 'parcial' | 'fallido' = 'ok';
    if (acumulado.consultasOk === 0) {
      estado = 'fallido';
    } else if (acumulado.consultasFallidas > 0 || acumulado.errores.length > 0) {
      estado = 'parcial';
    }

    Object.assign(corrida, {
      estado,
      finalizadaEn: new Date(),
      consultasTotal: acumulado.consultasTotal,
      consultasOk: acumulado.consultasOk,
      consultasFallidas: acumulado.consultasFallidas,
      registrosExtraidos: acumulado.extraidos,
      registrosValidos: acumulado.validos,
      registrosDuplicados: acumulado.duplicados,
      registrosDescartados: acumulado.descartados,
      descartesPorMotivo: acumulado.descartes,
      errores: acumulado.errores.slice(0, MAX_ERRORES_GUARDADOS),
      duracionMs,
    });
    await this.ejecuciones.save(corrida);
    this.logger.log(
      `Actualización de ${corrida.tienda}: estado=${estado} validos=${acumulado.validos} ` +
        `duplicados=${acumulado.duplicados} descartados=${acumulado.descartados} ` +
        `errores=${acumulado.errores.length} duracion_ms=${duracionMs}`,
    );
  }

  private numero(clave: string, porDefecto: number): number {
    const crudo = this.config.get<string | number>(clave);
    if (crudo === undefined || crudo === '') return porDefecto;
    const valor = Number(crudo);
    return Number.isFinite(valor) && valor >= 0 ? valor : porDefecto;
  }

  private get horasParaObsoleto(): number {
    return this.numero('PRICES_STALE_HOURS', 48);
  }
}
