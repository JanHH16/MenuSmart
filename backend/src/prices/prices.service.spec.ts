import {
  ConflictException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { MetricsService } from '../observability/metrics.service';
import { PythonClientService } from '../python-client/python-client.service';
import { ScrapedProduct, ScrapeSearchRequest } from '../python-client/scrape.types';
import { TERMINOS } from './catalogo';
import { EjecucionScraping } from './entities/ejecucion-scraping.entity';
import { PricesService } from './prices.service';

const LOTES_POR_TIENDA = Math.ceil(TERMINOS.length / 5);

function producto(slug: string, consulta = 'arroz'): ScrapedProduct {
  return {
    consulta,
    external_id: slug,
    nombre: `Producto ${slug}`,
    nombre_normalizado: `producto ${slug}`,
    marca: null,
    precio: 1500,
    moneda: 'CLP',
    cantidad: 1,
    unidad: 'kg',
    precio_unitario: 1500,
    disponible: true,
    url: `https://www.jumbo.cl/${slug}/p`,
    imagen: null,
  };
}

/** Arma lo que devolvería el cliente de Python para un lote de consultas. */
function resultado(
  peticion: ScrapeSearchRequest,
  productos: ScrapedProduct[],
  extra: { invalidos?: number; duplicados?: number; descartados?: number } = {},
) {
  const { invalidos = 0, duplicados = 0, descartados = 0 } = extra;
  return {
    invalidos,
    response: {
      tienda: peticion.tienda,
      estado: 'ok' as const,
      obtenido_en: '2026-11-21T20:00:00.000Z',
      resultados: productos,
      errores: [],
      estadisticas: {
        consultas_total: peticion.consultas.length,
        consultas_ok: peticion.consultas.length,
        consultas_fallidas: 0,
        registros_extraidos: productos.length + invalidos + duplicados + descartados,
        registros_validos: productos.length + invalidos,
        registros_duplicados: duplicados,
        registros_descartados: descartados,
        descartes_por_motivo: descartados ? { sin_precio: descartados } : {},
        duracion_ms: 5,
      },
    },
  };
}

describe('PricesService', () => {
  let servicio: PricesService;
  let metricas: MetricsService;
  let repo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOneBy: jest.Mock };
  let manager: { query: jest.Mock };
  let dataSource: { transaction: jest.Mock; query: jest.Mock };
  let python: { scrapeSearch: jest.Mock };
  let configuracion: Record<string, string>;

  beforeEach(async () => {
    let contador = 0;
    configuracion = { PRICES_MIN_REFRESH_INTERVAL_MINUTES: '0' };
    repo = {
      create: jest.fn((datos: object) => ({ id: `corrida-${++contador}`, ...datos })),
      save: jest.fn((entidad: object) => Promise.resolve(entidad)),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn(),
    };
    manager = {
      query: jest.fn((sql: string, parametros: unknown[][]) =>
        Promise.resolve(
          sql.includes('INSERT INTO "productos"')
            ? parametros[0].map((slug) => ({ id: `id-${String(slug)}`, slug }))
            : [],
        ),
      ),
    };
    dataSource = {
      transaction: jest.fn((trabajo: (m: unknown) => Promise<unknown>) => trabajo(manager)),
      query: jest.fn().mockResolvedValue([]),
    };
    python = { scrapeSearch: jest.fn() };

    const modulo = await Test.createTestingModule({
      providers: [
        PricesService,
        { provide: getRepositoryToken(EjecucionScraping), useValue: repo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: PythonClientService, useValue: python },
        MetricsService,
        { provide: ConfigService, useValue: { get: (clave: string) => configuracion[clave] } },
      ],
    }).compile();
    servicio = modulo.get(PricesService);
    metricas = modulo.get(MetricsService);
  });

  async function ejecutar(tiendas: ('jumbo' | 'santa_isabel')[] = ['jumbo']) {
    const corridas = await servicio.iniciarActualizacion(tiendas);
    await servicio.esperarActualizacion();
    return corridas;
  }

  describe('iniciarActualizacion', () => {
    it('devuelve de inmediato una corrida en curso por tienda', async () => {
      python.scrapeSearch.mockResolvedValue(resultado({ tienda: 'jumbo', consultas: [] }, []));
      const corridas = await servicio.iniciarActualizacion(['jumbo', 'santa_isabel']);
      expect(corridas.map((c) => c.tienda)).toEqual(['jumbo', 'santa_isabel']);
      expect(corridas.every((c) => c.id)).toBe(true);
      await servicio.esperarActualizacion();
    });

    it('recorre todo el catálogo en lotes y guarda lo recibido', async () => {
      let llamada = 0;
      python.scrapeSearch.mockImplementation((peticion: ScrapeSearchRequest) => {
        llamada++;
        return Promise.resolve(
          resultado(peticion, [producto(`a-${llamada}`), producto(`b-${llamada}`)]),
        );
      });

      const [corrida] = await ejecutar();

      expect(python.scrapeSearch).toHaveBeenCalledTimes(LOTES_POR_TIENDA);
      const consultasEnviadas = python.scrapeSearch.mock.calls.flatMap(
        ([peticion]: [ScrapeSearchRequest]) => peticion.consultas,
      );
      expect(consultasEnviadas).toEqual([...TERMINOS]);
      expect(corrida.estado).toBe('ok');
      expect(corrida.consultasTotal).toBe(TERMINOS.length);
      expect(corrida.consultasOk).toBe(TERMINOS.length);
      expect(corrida.registrosValidos).toBe(LOTES_POR_TIENDA * 2);
      expect(corrida.duracionMs).not.toBeNull();
      expect(corrida.finalizadaEn).toBeInstanceOf(Date);
      expect(manager.query).toHaveBeenCalledTimes(LOTES_POR_TIENDA * 2);
    });

    it('guarda los precios con la ejecución y la tienda de origen', async () => {
      python.scrapeSearch.mockImplementation((peticion: ScrapeSearchRequest) =>
        Promise.resolve(resultado(peticion, [producto(`unico-${peticion.consultas[0]}`)])),
      );
      const [corrida] = await ejecutar();

      const [, parametros] = manager.query.mock.calls.find(([sql]: [string]) =>
        sql.includes('INSERT INTO "precios_supermercado"'),
      ) as [string, unknown[]];
      expect(parametros[1]).toBe('jumbo');
      expect(parametros[2]).toBe('2026-11-21T20:00:00.000Z');
      expect(parametros[3]).toBe('2026-11-21');
      expect(parametros[4]).toBe(corrida.id);
    });

    it('si Python falla en un lote sigue con el resto y termina como parcial', async () => {
      let llamada = 0;
      python.scrapeSearch.mockImplementation((peticion: ScrapeSearchRequest) => {
        llamada++;
        if (llamada === 2) return Promise.reject(new ServiceUnavailableException('caído'));
        return Promise.resolve(resultado(peticion, [producto(`p-${llamada}`)]));
      });

      const [corrida] = await ejecutar();

      expect(python.scrapeSearch).toHaveBeenCalledTimes(LOTES_POR_TIENDA);
      expect(corrida.estado).toBe('parcial');
      expect(corrida.consultasFallidas).toBe(5);
      expect(corrida.registrosValidos).toBe(LOTES_POR_TIENDA - 1);
      expect(corrida.errores).toHaveLength(1);
      expect(corrida.errores[0].tipo).toBe('servicio_python');
      expect(corrida.errores[0].detalle).toContain('caído');
    });

    it('registra en las métricas el resultado de la actualización y sus errores', async () => {
      let llamada = 0;
      python.scrapeSearch.mockImplementation((peticion: ScrapeSearchRequest) => {
        llamada++;
        if (llamada === 2) return Promise.reject(new ServiceUnavailableException('caído'));
        return Promise.resolve(resultado(peticion, [producto(`m-${llamada}`)]));
      });

      await ejecutar();

      const fuente = metricas.snapshot().fuenteExterna.jumbo;
      expect(fuente.corridas).toBe(1);
      expect(fuente.porEstado).toEqual({ parcial: 1 });
      expect(fuente.erroresPorTipo).toEqual({ servicio_python: 1 });
    });

    it('termina como fallido, sin guardar nada, si ningún lote funciona', async () => {
      python.scrapeSearch.mockRejectedValue(new ServiceUnavailableException('caído'));
      const [corrida] = await ejecutar();
      expect(corrida.estado).toBe('fallido');
      expect(corrida.consultasOk).toBe(0);
      expect(corrida.registrosValidos).toBe(0);
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('cuenta como duplicados los productos repetidos entre lotes y no los guarda de nuevo', async () => {
      python.scrapeSearch.mockImplementation((peticion: ScrapeSearchRequest) =>
        Promise.resolve(resultado(peticion, [producto('siempre-el-mismo')])),
      );
      const [corrida] = await ejecutar();
      expect(corrida.registrosValidos).toBe(1);
      expect(corrida.registrosDuplicados).toBe(LOTES_POR_TIENDA - 1);
      expect(corrida.registrosExtraidos).toBe(LOTES_POR_TIENDA);
      expect(manager.query).toHaveBeenCalledTimes(2);
    });

    it('descarta y cuenta los registros inválidos que Python entregó', async () => {
      python.scrapeSearch.mockImplementation((peticion: ScrapeSearchRequest) =>
        Promise.resolve(
          resultado(peticion, [producto(`v-${peticion.consultas[0]}`)], {
            invalidos: 2,
            descartados: 1,
          }),
        ),
      );
      const [corrida] = await ejecutar();
      expect(corrida.registrosDescartados).toBe(LOTES_POR_TIENDA * 3);
      expect(corrida.descartesPorMotivo.respuesta_invalida).toBe(LOTES_POR_TIENDA * 2);
      expect(corrida.descartesPorMotivo.sin_precio).toBe(LOTES_POR_TIENDA);
      const clasificados =
        corrida.registrosValidos + corrida.registrosDuplicados + corrida.registrosDescartados;
      expect(corrida.registrosExtraidos).toBe(clasificados);
    });

    it('conserva los errores que reporta la tienda', async () => {
      python.scrapeSearch.mockImplementation((peticion: ScrapeSearchRequest) => {
        const base = resultado(peticion, [producto(`e-${peticion.consultas[0]}`)]);
        base.response.errores = [{ consulta: 'arroz', tipo: 'timeout', detalle: 'lento' }] as never;
        return Promise.resolve(base);
      });
      const [corrida] = await ejecutar();
      expect(corrida.estado).toBe('parcial');
      expect(corrida.errores[0]).toEqual({ consulta: 'arroz', tipo: 'timeout', detalle: 'lento' });
    });
  });

  describe('limitación de frecuencia', () => {
    it('rechaza con 409 si ya hay una actualización en curso', async () => {
      repo.find.mockResolvedValueOnce([{ id: 'otra', estado: 'en_curso' }]);
      await expect(servicio.iniciarActualizacion(['jumbo'])).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rechaza con 429 si hubo una actualización exitosa hace poco', async () => {
      configuracion.PRICES_MIN_REFRESH_INTERVAL_MINUTES = '10';
      repo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ finalizadaEn: new Date(Date.now() - 60_000) }]);

      const error = await servicio.iniciarActualizacion(['jumbo']).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      const cuerpo = (error as HttpException).getResponse() as { retryAfterSeconds: number };
      expect(cuerpo.retryAfterSeconds).toBeGreaterThan(500);
      expect(cuerpo.retryAfterSeconds).toBeLessThanOrEqual(540);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('permite actualizar si no hubo una exitosa reciente', async () => {
      configuracion.PRICES_MIN_REFRESH_INTERVAL_MINUTES = '10';
      python.scrapeSearch.mockResolvedValue(resultado({ tienda: 'jumbo', consultas: [] }, []));
      await expect(ejecutar()).resolves.toHaveLength(1);
    });
  });

  describe('consultas', () => {
    it('obtenerEjecucion lanza NotFound si no existe', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(servicio.obtenerEjecucion('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('obtenerEjecucion devuelve la ejecución', async () => {
      repo.findOneBy.mockResolvedValue({ id: 'abc', estado: 'ok' });
      await expect(servicio.obtenerEjecucion('abc')).resolves.toMatchObject({ estado: 'ok' });
    });

    it('comparar sin términos usa todo el catálogo e informa la última actualización', async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { tienda: 'jumbo', finalizadaEn: new Date('2026-11-21T18:00:00Z') },
        ]);
      const resultado = await servicio.comparar(undefined, 5);
      expect(dataSource.query.mock.calls[0][1][0]).toHaveLength(TERMINOS.length);
      expect(resultado.terminos).toHaveLength(TERMINOS.length);
      expect(resultado.ultimaActualizacion).toEqual({
        jumbo: '2026-11-21T18:00:00.000Z',
        santa_isabel: null,
      });
      expect(resultado.horasParaObsoleto).toBe(48);
    });

    it('calidad combina las ejecuciones con la cobertura del catálogo', async () => {
      repo.find.mockResolvedValue([]);
      dataSource.query.mockResolvedValue([
        { supermercado: 'jumbo', consulta: 'arroz' },
        { supermercado: 'santa_isabel', consulta: 'arroz' },
        { supermercado: 'jumbo', consulta: 'pollo' },
      ]);
      const calidad = await servicio.calidad();
      expect(calidad.tiendas.jumbo.cobertura.terminosConPrecio).toBe(2);
      expect(calidad.coberturaAmbasTiendas.terminosConPrecio).toBe(1);
      expect(calidad.coberturaAmbasTiendas.terminosTotal).toBe(TERMINOS.length);
    });
  });
});
