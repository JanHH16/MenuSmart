import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrearComidaDto } from '../meals/dto/meal.dto';
import { Comida } from '../meals/entities/comida.entity';
import { MealsService, semanaDe } from '../meals/meals.service';
import { TERMINOS } from '../prices/catalogo';
import { PricesService } from '../prices/prices.service';
import { PythonClientService } from '../python-client/python-client.service';
import { Tienda } from '../python-client/scrape.types';
import { AceptarRecomendacionDto, RecomendacionesQueryDto } from './dto/recommendation.dto';
import { RecomendacionFeedback } from './entities/recomendacion-feedback.entity';
import { Receta, RECETAS, recetaPorId } from './recetas';
import { Candidata, costoDeReceta, ordenBase, pesosDesdeCosto, puntuar } from './scoring';

export interface RecomendacionRespuesta {
  recetaId: string;
  nombre: string;
  tipo: string;
  porciones: number;
  ingredientes: { termino: string; cantidad: number; unidad: string }[];
  costoPorPorcion: number | null;
  costoTotal: number | null;
  costoPorTienda: Record<Tienda, number | null>;
  /** Fraccion (0 a 1) de ingredientes con precio. */
  cobertura: number;
  ingredientesCompartidos: string[];
  ingredientesNuevos: string[];
  sinPrecio: string[];
  /** null cuando se pide el orden base (sin adaptación). */
  puntaje: number | null;
  /** Por que se sugiere esta receta, en palabras. */
  explicacion: string[];
}

export interface RecomendacionesRespuesta {
  semana: string;
  adaptativo: boolean;
  pesos: { costo: number; reuso: number };
  /** Ingredientes del catalogo que ya estan en el plan de la semana. */
  ingredientesDelPlan: string[];
  excluidos: string[];
  /** Cuantas recetas se dejaron fuera por decision del usuario. */
  descartadas: { rechazadas: number; porIngredienteExcluido: number };
  preciosActualizadosEn: Record<string, string | null>;
  recomendaciones: RecomendacionRespuesta[];
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectRepository(RecomendacionFeedback)
    private readonly feedback: Repository<RecomendacionFeedback>,
    private readonly meals: MealsService,
    private readonly prices: PricesService,
    private readonly python: PythonClientService,
  ) {}

  /**
   * Sugiere recetas para la semana. En modo adaptativo las ordena por costo por porcion y por
   * reutilizacion de los ingredientes ya planificados, respetando los rechazos y exclusiones del
   * usuario; en modo base (`adaptativo=false`) las devuelve en orden alfabetico, sin adaptacion.
   */
  async recomendar(
    usuarioId: string,
    consulta: RecomendacionesQueryDto,
  ): Promise<RecomendacionesRespuesta> {
    const semana = semanaDe(consulta.semana);
    const adaptativo = consulta.adaptativo ?? true;
    const pesos = pesosDesdeCosto(consulta.pesoCosto ?? 60);
    const excluidos = consulta.excluir ?? [];

    const comidas = await this.meals.listar(usuarioId, semana);
    const terminosDelPlan = await this.terminosDelPlan(comidas);
    const rechazadas = new Set(
      (await this.feedback.find({ where: { usuarioId, accion: 'rechazada' } })).map(
        (f) => f.recetaId,
      ),
    );

    let rechazadasOcultas = 0;
    let porExclusion = 0;
    const visibles = RECETAS.filter((receta) => !consulta.tipo || receta.tipo === consulta.tipo).filter(
      (receta) => {
        if (rechazadas.has(receta.id)) {
          rechazadasOcultas += 1;
          return false;
        }
        if (receta.ingredientes.some((i) => excluidos.includes(i.termino))) {
          porExclusion += 1;
          return false;
        }
        return true;
      },
    );

    const precios = await this.prices.preciosVigentes([...TERMINOS]);
    const candidatas: Candidata[] = visibles.map((receta) => ({
      receta,
      costo: costoDeReceta(receta, precios.filas, precios.ahora, precios.horasParaObsoleto),
    }));

    const limite = consulta.limite ?? 10;
    const recomendaciones = (
      adaptativo
        ? puntuar(candidatas, terminosDelPlan, pesos)
        : ordenBase(candidatas).map((c) => ({
            ...c,
            puntaje: null as number | null,
            ingredientesCompartidos: c.receta.ingredientes
              .map((i) => i.termino)
              .filter((t) => terminosDelPlan.has(t)),
            ingredientesNuevos: c.receta.ingredientes
              .map((i) => i.termino)
              .filter((t) => !terminosDelPlan.has(t)),
            explicacion: ['Orden alfabético: la adaptación está desactivada.'],
          }))
    )
      .slice(0, limite)
      .map((p) => this.aRespuesta(p.receta, p));

    return {
      semana,
      adaptativo,
      pesos,
      ingredientesDelPlan: [...terminosDelPlan].sort(),
      excluidos,
      descartadas: { rechazadas: rechazadasOcultas, porIngredienteExcluido: porExclusion },
      preciosActualizadosEn: precios.ultimaActualizacion,
      recomendaciones,
    };
  }

  /** Agrega la receta al plan del usuario y recuerda que la acepto. */
  async aceptar(usuarioId: string, dto: AceptarRecomendacionDto): Promise<Comida> {
    const receta = recetaPorId(dto.recetaId) as Receta;
    const comida = await this.meals.crear(usuarioId, {
      nombre: receta.nombre,
      tipo: dto.tipo ?? receta.tipo,
      diaSemana: dto.diaSemana,
      semana: dto.semana,
      porciones: receta.porciones,
      ingredientes: receta.ingredientes.map((i) => ({
        nombre: i.termino,
        cantidad: i.cantidad,
        unidad: i.unidad,
      })),
    } as CrearComidaDto);
    await this.registrar(usuarioId, receta.id, 'aceptada');
    return comida;
  }

  async rechazar(usuarioId: string, recetaId: string): Promise<void> {
    await this.registrar(usuarioId, recetaId, 'rechazada');
  }

  /** Vuelve a mostrar las recetas que el usuario rechazo. */
  async restablecerRechazos(usuarioId: string): Promise<void> {
    await this.feedback.delete({ usuarioId, accion: 'rechazada' });
  }

  private async registrar(usuarioId: string, recetaId: string, accion: string): Promise<void> {
    await this.feedback.upsert({ usuarioId, recetaId, accion }, ['usuarioId', 'recetaId']);
  }

  /**
   * Ingredientes del catalogo presentes en las comidas de la semana. Se normalizan con el mismo
   * servicio Python que arma la lista de compras, para que "Tomates" y "tomate" cuenten igual.
   * Si Python no responde, el recomendador sigue funcionando sin medir la reutilización.
   */
  private async terminosDelPlan(comidas: Comida[]): Promise<Set<string>> {
    const lineas = comidas.flatMap((comida) =>
      comida.ingredientes.map((i) => ({ name: i.nombre, quantity: i.cantidad, unit: i.unidad })),
    );
    if (lineas.length === 0) return new Set();
    try {
      const { items } = await this.python.normalizeIngredients(lineas);
      return new Set(items.map((i) => i.term).filter((t): t is string => !!t));
    } catch {
      this.logger.warn('No se pudo normalizar el plan; se recomienda sin medir reutilización');
      return new Set();
    }
  }

  private aRespuesta(
    receta: Receta,
    puntuada: {
      costo: Candidata['costo'];
      puntaje: number | null;
      ingredientesCompartidos: string[];
      ingredientesNuevos: string[];
      explicacion: string[];
    },
  ): RecomendacionRespuesta {
    return {
      recetaId: receta.id,
      nombre: receta.nombre,
      tipo: receta.tipo,
      porciones: receta.porciones,
      ingredientes: receta.ingredientes.map((i) => ({
        termino: i.termino,
        cantidad: i.cantidad,
        unidad: i.unidad,
      })),
      costoPorPorcion: puntuada.costo.porPorcion,
      costoTotal: puntuada.costo.total,
      costoPorTienda: puntuada.costo.porTienda,
      cobertura: Math.round(puntuada.costo.cobertura * 100) / 100,
      ingredientesCompartidos: puntuada.ingredientesCompartidos,
      ingredientesNuevos: puntuada.ingredientesNuevos,
      sinPrecio: puntuada.costo.sinPrecio,
      puntaje: puntuada.puntaje,
      explicacion: puntuada.explicacion,
    };
  }
}
