import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { PlanSemanalService } from './plan-semanal.service';

export type EstadoSugerencias = 'cargando' | 'listo' | 'error';
export type FiltroTipo = 'todos' | 'desayuno' | 'almuerzo' | 'cena';

export interface IngredienteSugerido {
  termino: string;
  cantidad: number;
  unidad: string;
}

export interface Sugerencia {
  recetaId: string;
  nombre: string;
  /** Tipo con la primera letra en mayúscula, listo para mostrar. */
  tipo: string;
  /** Tipo tal como lo usa la API ("almuerzo"). */
  tipoApi: string;
  porciones: number;
  ingredientes: IngredienteSugerido[];
  costoPorPorcion: number | null;
  costoTotal: number | null;
  /** Costo comprando todo en una tienda; null si a esa tienda le falta algún precio. */
  costoJumbo: number | null;
  costoSantaIsabel: number | null;
  /** Ingredientes que ya tienes en tu semana. */
  compartidos: string[];
  nuevos: string[];
  sinPrecio: string[];
  /** Por qué se sugiere, en palabras. */
  explicacion: string[];
}

export interface ResumenSugerencias {
  adaptativo: boolean;
  pesos: { costo: number; reuso: number };
  ingredientesDelPlan: string[];
  excluidos: string[];
  descartadasRechazadas: number;
  descartadasPorExclusion: number;
  preciosJumbo: Date | null;
  preciosSantaIsabel: Date | null;
}

export interface MensajeSugerencias {
  tipo: 'ok' | 'error';
  texto: string;
}

/** Ingredientes del catálogo de precios del backend (backend/src/prices/catalogo.ts). */
export const INGREDIENTES_CATALOGO: { termino: string; etiqueta: string }[] = [
  ['arroz', 'Arroz'],
  ['fideos', 'Fideos'],
  ['harina', 'Harina'],
  ['azucar', 'Azúcar'],
  ['aceite', 'Aceite'],
  ['sal', 'Sal'],
  ['lentejas', 'Lentejas'],
  ['porotos', 'Porotos'],
  ['atun', 'Atún'],
  ['salsa de tomate', 'Salsa de tomate'],
  ['pollo', 'Pollo'],
  ['carne molida', 'Carne molida'],
  ['cerdo', 'Cerdo'],
  ['merluza', 'Merluza'],
  ['salmon', 'Salmón'],
  ['tomate', 'Tomate'],
  ['cebolla', 'Cebolla'],
  ['papa', 'Papa'],
  ['zanahoria', 'Zanahoria'],
  ['lechuga', 'Lechuga'],
  ['palta', 'Palta'],
  ['limon', 'Limón'],
  ['manzana', 'Manzana'],
  ['platano', 'Plátano'],
  ['zapallo', 'Zapallo'],
  ['leche', 'Leche'],
  ['huevos', 'Huevos'],
  ['queso', 'Queso'],
  ['mantequilla', 'Mantequilla'],
  ['yogurt', 'Yogurt'],
  ['pan', 'Pan'],
].map(([termino, etiqueta]) => ({ termino, etiqueta }));

const TERMINOS_VALIDOS = new Set(INGREDIENTES_CATALOGO.map((i) => i.termino));

/** Nombre legible de un ingrediente del catálogo ("azucar" => "Azúcar"). */
export function etiquetaDeIngrediente(termino: string): string {
  return INGREDIENTES_CATALOGO.find((i) => i.termino === termino)?.etiqueta ?? termino;
}

export const PESO_COSTO_INICIAL = 60;
export const LIMITE_INICIAL = 12;
export const LIMITE_MAXIMO = 30;
const PASO_LIMITE = 12;

interface IngredienteApi {
  termino: string;
  cantidad: number;
  unidad: string;
}

interface RecomendacionApi {
  recetaId: string;
  nombre: string;
  tipo: string;
  porciones: number;
  ingredientes: IngredienteApi[];
  costoPorPorcion: number | null;
  costoTotal: number | null;
  costoPorTienda: { jumbo: number | null; santa_isabel: number | null };
  ingredientesCompartidos: string[];
  ingredientesNuevos: string[];
  sinPrecio: string[];
  explicacion: string[];
}

interface RecomendacionesApi {
  adaptativo: boolean;
  pesos: { costo: number; reuso: number };
  ingredientesDelPlan: string[];
  excluidos: string[];
  descartadas: { rechazadas: number; porIngredienteExcluido: number };
  preciosActualizadosEn: { jumbo?: string | null; santa_isabel?: string | null };
  recomendaciones: RecomendacionApi[];
}

interface ComodidadesGuardadas {
  pesoCosto: number;
  excluidos: string[];
  adaptativo: boolean;
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const aFecha = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

/**
 * Sugerencias de recetas para la semana (GET /recommendations). El orden se adapta al costo por
 * porción y a los ingredientes que ya están en el plan; el usuario ve el porqué de cada sugerencia
 * y decide si la acepta, la rechaza o cambia cuánto pesa cada variable.
 *
 * En este dispositivo solo se guardan comodidades de la pantalla (peso del costo, ingredientes
 * excluidos y si la adaptación está activa). Lo que se acepta o rechaza queda en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class RecomendacionesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly planSemanal = inject(PlanSemanalService);
  private readonly baseUrl = `${environment.apiUrl}/recommendations`;

  private readonly _sugerencias = signal<Sugerencia[]>([]);
  private readonly _resumen = signal<ResumenSugerencias | null>(null);
  private readonly _estado = signal<EstadoSugerencias>('cargando');
  private readonly _errorCarga = signal<string | null>(null);
  private readonly _mensaje = signal<MensajeSugerencias | null>(null);
  /** Receta con una acción en curso, o "todas" al volver a mostrar las descartadas. */
  private readonly _ocupada = signal<string | null>(null);
  private readonly _pesoCosto = signal(PESO_COSTO_INICIAL);
  private readonly _excluidos = signal<string[]>([]);
  private readonly _adaptativo = signal(true);
  private readonly _tipo = signal<FiltroTipo>('todos');
  private readonly _limite = signal(LIMITE_INICIAL);

  private claveCargada: string | null = null;
  private consulta = 0;

  readonly sugerencias = this._sugerencias.asReadonly();
  readonly resumen = this._resumen.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly errorCarga = this._errorCarga.asReadonly();
  readonly mensaje = this._mensaje.asReadonly();
  readonly ocupada = this._ocupada.asReadonly();
  readonly pesoCosto = this._pesoCosto.asReadonly();
  readonly excluidos = this._excluidos.asReadonly();
  readonly adaptativo = this._adaptativo.asReadonly();
  readonly tipo = this._tipo.asReadonly();

  readonly semana = this.planSemanal.lunes;
  /** Nombres de las comidas que ya están en la semana, para marcar las sugerencias repetidas. */
  readonly nombresEnPlan = computed(() => new Set(this.planSemanal.comidas().map((c) => c.nombre)));
  /** Puede haber más sugerencias que las mostradas. */
  readonly hayMas = computed(
    () => this._sugerencias().length >= this._limite() && this._limite() < LIMITE_MAXIMO,
  );

  /** Pide las sugerencias con los controles actuales. Si falla, conserva las que ya se veían. */
  async cargar(): Promise<void> {
    this.sincronizarComodidades();
    const numero = ++this.consulta;
    if (this._sugerencias().length === 0) {
      this._estado.set('cargando');
    }
    try {
      const respuesta = await firstValueFrom(
        this.http.get<RecomendacionesApi>(this.baseUrl, { params: this.parametros() }),
      );
      if (numero !== this.consulta) {
        return; // llegó una respuesta más nueva (el usuario movió otro control)
      }
      this._sugerencias.set(respuesta.recomendaciones.map((r) => this.aSugerencia(r)));
      this._resumen.set(this.aResumen(respuesta));
      this._errorCarga.set(null);
      this._estado.set('listo');
    } catch (error) {
      if (numero !== this.consulta) {
        return;
      }
      const texto = this.mensajeDeError(error, 'cargar');
      if (this._sugerencias().length > 0) {
        this._mensaje.set({ tipo: 'error', texto });
        this._estado.set('listo');
      } else {
        this._errorCarga.set(texto);
        this._estado.set('error');
      }
    }
  }

  /** Cambia la importancia del costo (0 a 100). No consulta: se hace con `cargar()` al soltar. */
  fijarPesoCosto(valor: number): void {
    const entero = Math.round(Number(valor));
    this._pesoCosto.set(Number.isFinite(entero) ? Math.min(100, Math.max(0, entero)) : PESO_COSTO_INICIAL);
    this.guardarComodidades();
  }

  async activarAdaptacion(activa: boolean): Promise<void> {
    this._adaptativo.set(activa);
    this.guardarComodidades();
    await this.cargar();
  }

  async elegirTipo(tipo: FiltroTipo): Promise<void> {
    this._tipo.set(tipo);
    await this.cargar();
  }

  /** Excluye o vuelve a permitir un ingrediente del catálogo. */
  async alternarExcluido(termino: string): Promise<void> {
    if (!TERMINOS_VALIDOS.has(termino)) {
      return;
    }
    this._excluidos.update((actuales) =>
      actuales.includes(termino) ? actuales.filter((t) => t !== termino) : [...actuales, termino],
    );
    this.guardarComodidades();
    await this.cargar();
  }

  async limpiarExcluidos(): Promise<void> {
    if (this._excluidos().length === 0) {
      return;
    }
    this._excluidos.set([]);
    this.guardarComodidades();
    await this.cargar();
  }

  async verMas(): Promise<void> {
    this._limite.update((limite) => Math.min(LIMITE_MAXIMO, limite + PASO_LIMITE));
    await this.cargar();
  }

  /** Agrega la sugerencia al día elegido de la semana vista y recarga plan y sugerencias. */
  async aceptar(recetaId: string, diaSemana: string, nombreDia: string): Promise<boolean> {
    if (this._ocupada()) {
      return false;
    }
    const receta = this._sugerencias().find((s) => s.recetaId === recetaId);
    this._ocupada.set(recetaId);
    this._mensaje.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/accept`, {
          recetaId,
          diaSemana,
          semana: this.planSemanal.lunes(),
        }),
      );
    } catch (error) {
      this._mensaje.set({ tipo: 'error', texto: this.mensajeDeError(error, 'aceptar') });
      this._ocupada.set(null);
      return false;
    }
    this._mensaje.set({
      tipo: 'ok',
      texto: `Agregamos "${receta?.nombre ?? 'la receta'}" al ${nombreDia.toLowerCase()} de tu semana.`,
    });
    // El plan cambió: se recarga para que las sugerencias reutilicen también esta comida.
    await this.planSemanal.cargar();
    await this.cargar();
    this._ocupada.set(null);
    return true;
  }

  /** "No me interesa": deja de mostrar la sugerencia (el servidor lo recuerda). */
  async rechazar(recetaId: string): Promise<boolean> {
    if (this._ocupada()) {
      return false;
    }
    this._ocupada.set(recetaId);
    this._mensaje.set(null);
    try {
      await firstValueFrom(this.http.post<void>(`${this.baseUrl}/reject`, { recetaId }));
    } catch (error) {
      this._mensaje.set({ tipo: 'error', texto: this.mensajeDeError(error, 'rechazar') });
      this._ocupada.set(null);
      return false;
    }
    this._sugerencias.update((lista) => lista.filter((s) => s.recetaId !== recetaId));
    await this.cargar();
    this._ocupada.set(null);
    return true;
  }

  /** Vuelve a mostrar las sugerencias descartadas antes. */
  async restablecer(): Promise<boolean> {
    if (this._ocupada()) {
      return false;
    }
    this._ocupada.set('todas');
    this._mensaje.set(null);
    try {
      await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/feedback`));
    } catch (error) {
      this._mensaje.set({ tipo: 'error', texto: this.mensajeDeError(error, 'restablecer') });
      this._ocupada.set(null);
      return false;
    }
    this._mensaje.set({ tipo: 'ok', texto: 'Volvimos a mostrar las sugerencias que descartaste.' });
    await this.cargar();
    this._ocupada.set(null);
    return true;
  }

  cerrarMensaje(): void {
    this._mensaje.set(null);
  }

  private parametros(): HttpParams {
    let params = new HttpParams()
      .set('semana', this.planSemanal.lunes())
      .set('pesoCosto', this._pesoCosto())
      .set('adaptativo', this._adaptativo())
      .set('limite', this._limite());
    if (this._excluidos().length > 0) {
      params = params.set('excluir', this._excluidos().join(','));
    }
    if (this._tipo() !== 'todos') {
      params = params.set('tipo', this._tipo());
    }
    return params;
  }

  private aSugerencia(api: RecomendacionApi): Sugerencia {
    return {
      recetaId: api.recetaId,
      nombre: api.nombre,
      tipo: capitalizar(api.tipo),
      tipoApi: api.tipo,
      porciones: api.porciones,
      ingredientes: api.ingredientes,
      costoPorPorcion: api.costoPorPorcion,
      costoTotal: api.costoTotal,
      costoJumbo: api.costoPorTienda.jumbo,
      costoSantaIsabel: api.costoPorTienda.santa_isabel,
      compartidos: api.ingredientesCompartidos,
      nuevos: api.ingredientesNuevos,
      sinPrecio: api.sinPrecio,
      explicacion: api.explicacion,
    };
  }

  private aResumen(api: RecomendacionesApi): ResumenSugerencias {
    return {
      adaptativo: api.adaptativo,
      pesos: api.pesos,
      ingredientesDelPlan: api.ingredientesDelPlan,
      excluidos: api.excluidos,
      descartadasRechazadas: api.descartadas.rechazadas,
      descartadasPorExclusion: api.descartadas.porIngredienteExcluido,
      preciosJumbo: aFecha(api.preciosActualizadosEn.jumbo),
      preciosSantaIsabel: aFecha(api.preciosActualizadosEn.santa_isabel),
    };
  }

  private mensajeDeError(
    error: unknown,
    accion: 'cargar' | 'aceptar' | 'rechazar' | 'restablecer',
  ): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
    }
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return accion === 'cargar'
        ? 'Alguno de los filtros no es válido. Cambia la selección e intenta de nuevo.'
        : 'No se pudo completar la acción con esos datos. Recarga las sugerencias e intenta de nuevo.';
    }
    switch (accion) {
      case 'aceptar':
        return 'No se pudo agregar la comida a tu semana. Intenta de nuevo.';
      case 'rechazar':
        return 'No se pudo descartar la sugerencia. Intenta de nuevo.';
      case 'restablecer':
        return 'No se pudieron volver a mostrar las sugerencias descartadas. Intenta de nuevo.';
      default:
        return 'No se pudieron cargar las sugerencias ahora mismo. Intenta de nuevo en un momento.';
    }
  }

  // --- comodidades en este dispositivo (por usuario) ---

  private clave(): string {
    let email: string | null = null;
    try {
      email = this.auth.getEmail();
    } catch {
      // Sin acceso al almacenamiento no se conoce la cuenta: se usa la clave anónima.
    }
    return `menusmart_sugerencias_${email ?? 'anonimo'}`;
  }

  /** Si cambió la cuenta, vuelve a leer las comodidades de la nueva. */
  private sincronizarComodidades(): void {
    const clave = this.clave();
    if (clave === this.claveCargada) {
      return;
    }
    this.claveCargada = clave;
    const guardadas = this.leerComodidades(clave);
    this._pesoCosto.set(guardadas?.pesoCosto ?? PESO_COSTO_INICIAL);
    this._excluidos.set(guardadas?.excluidos ?? []);
    this._adaptativo.set(guardadas?.adaptativo ?? true);
  }

  private leerComodidades(clave: string): ComodidadesGuardadas | null {
    try {
      const crudo = localStorage.getItem(clave);
      if (!crudo) {
        return null;
      }
      const datos = JSON.parse(crudo) as Partial<ComodidadesGuardadas>;
      const peso = Number(datos.pesoCosto);
      return {
        pesoCosto: Number.isFinite(peso) ? Math.min(100, Math.max(0, Math.round(peso))) : PESO_COSTO_INICIAL,
        excluidos: Array.isArray(datos.excluidos)
          ? datos.excluidos.filter((t): t is string => typeof t === 'string' && TERMINOS_VALIDOS.has(t))
          : [],
        adaptativo: typeof datos.adaptativo === 'boolean' ? datos.adaptativo : true,
      };
    } catch {
      return null;
    }
  }

  private guardarComodidades(): void {
    const clave = this.clave();
    this.claveCargada = clave;
    const datos: ComodidadesGuardadas = {
      pesoCosto: this._pesoCosto(),
      excluidos: this._excluidos(),
      adaptativo: this._adaptativo(),
    };
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
    } catch {
      // Sin almacenamiento (modo privado o lleno): la pantalla sigue funcionando sin recordar.
    }
  }
}
