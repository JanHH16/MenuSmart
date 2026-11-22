import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { formatearCantidad, parsearCantidad } from '../utils/cantidad';
import { hoyISO, lunesDe, rangoDeSemana, sumarDias } from '../utils/semana';

export interface Ingrediente {
  id: string;
  nombre: string;
  /** Texto para mostrar, por ejemplo "400 g" o "4 unid.". */
  cantidad: string;
}

export interface Comida {
  id: string;
  nombre: string;
  tipo: string;
  dia: string;
  ingredientes: Ingrediente[];
  /**
   * webPath (Capacitor Camera) o data URL de la foto elegida. La foto vive solo en este
   * dispositivo y mientras la app esté abierta: el servidor no la guarda (privacidad y peso).
   */
  foto?: string;
  notas?: string;
}

export interface DiaPlan {
  diaCorto: string;
  nombre: string;
  numero: number;
  esHoy: boolean;
  comidas: Comida[];
}

export interface NuevaComida {
  nombre: string;
  dia: string;
  tipo: string;
  foto?: string;
  notas?: string;
  ingredientes?: { nombre: string; cantidad: string }[];
}

export interface ComidaGuardada {
  nombre: string;
  tipoOriginal: string;
  ingredientes: Ingrediente[];
  foto?: string;
  notas?: string;
}

export type EstadoCarga = 'cargando' | 'listo' | 'error';

export const TIPOS_COMIDA = ['Desayuno', 'Almuerzo', 'Cena'];

interface IngredienteApi {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface ComidaApi {
  id: string;
  nombre: string;
  tipo: string;
  diaSemana: string;
  notas: string | null;
  ingredientes: IngredienteApi[];
}

const DIAS = [
  { corto: 'LUN', nombre: 'Lunes', api: 'lunes' },
  { corto: 'MAR', nombre: 'Martes', api: 'martes' },
  { corto: 'MIE', nombre: 'Miércoles', api: 'miercoles' },
  { corto: 'JUE', nombre: 'Jueves', api: 'jueves' },
  { corto: 'VIE', nombre: 'Viernes', api: 'viernes' },
  { corto: 'SAB', nombre: 'Sábado', api: 'sabado' },
  { corto: 'DOM', nombre: 'Domingo', api: 'domingo' },
];

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const diaDeApi = (api: string) => DIAS.find((dia) => dia.api === api)?.nombre ?? capitalizar(api);
const diaAApi = (nombre: string) => DIAS.find((dia) => dia.nombre === nombre)?.api ?? nombre.toLowerCase();

/** Cantidad escrita por el usuario a lo que espera la API; sin número queda como 1 unidad. */
function ingredienteAApi(ingrediente: { nombre: string; cantidad: string }) {
  const parseada = parsearCantidad(ingrediente.cantidad);
  return {
    nombre: ingrediente.nombre,
    cantidad: parseada?.cantidad ?? 1,
    unidad: parseada?.unidad ?? 'un',
  };
}

/**
 * Plan semanal del usuario, guardado en el backend (GET/POST/PATCH/DELETE /meals). Mantiene la
 * semana que se está viendo y sus comidas en signals; las operaciones que escriben devuelven una
 * promesa para que la pantalla pueda esperar el resultado y avisar si algo falla.
 */
@Injectable({ providedIn: 'root' })
export class PlanSemanalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/meals`;
  private readonly fotos = new Map<string, string>();

  private readonly _lunes = signal(lunesDe(hoyISO()));
  private readonly _comidas = signal<Comida[]>([]);
  private readonly _estado = signal<EstadoCarga>('cargando');

  readonly lunes = this._lunes.asReadonly();
  readonly comidas = this._comidas.asReadonly();
  readonly estado = this._estado.asReadonly();

  readonly rangoSemana = computed(() => rangoDeSemana(this._lunes()));
  readonly totalComidas = computed(() => this._comidas().length);

  readonly semana = computed<DiaPlan[]>(() => {
    const hoy = hoyISO();
    return DIAS.map((dia, indice) => {
      const fecha = sumarDias(this._lunes(), indice);
      return {
        diaCorto: dia.corto,
        nombre: dia.nombre,
        numero: Number(fecha.slice(8)),
        esHoy: fecha === hoy,
        comidas: this._comidas().filter((comida) => comida.dia === dia.nombre),
      };
    });
  });

  /**
   * Comidas de la semana vista, una por nombre, para repetirlas otro día sin volver a cargar
   * sus ingredientes (ej. "Pollo al horno" del martes también el sábado).
   */
  readonly comidasGuardadas = computed<ComidaGuardada[]>(() => {
    const vistas = new Set<string>();
    const guardadas: ComidaGuardada[] = [];
    for (const comida of this._comidas()) {
      if (vistas.has(comida.nombre)) {
        continue;
      }
      vistas.add(comida.nombre);
      guardadas.push({
        nombre: comida.nombre,
        tipoOriginal: comida.tipo,
        ingredientes: comida.ingredientes,
        foto: comida.foto,
        notas: comida.notas,
      });
    }
    return guardadas;
  });

  /** Días de la semana (nombre corto para chips + nombre completo para guardar). */
  getDiasSemana(): { corto: string; nombre: string }[] {
    return DIAS.map((dia) => ({ corto: dia.corto, nombre: dia.nombre }));
  }

  /** Carga la semana indicada (cualquier fecha dentro de ella) o la que ya se estaba viendo. */
  async cargar(fecha?: string): Promise<void> {
    if (fecha) {
      this._lunes.set(lunesDe(fecha));
    }
    if (this._comidas().length === 0) {
      this._estado.set('cargando');
    }
    try {
      const comidas = await firstValueFrom(
        this.http.get<ComidaApi[]>(this.baseUrl, { params: { semana: this._lunes() } }),
      );
      this._comidas.set(comidas.map((comida) => this.aComida(comida)));
      this._estado.set('listo');
    } catch {
      this._estado.set(this._comidas().length > 0 ? 'listo' : 'error');
    }
  }

  async cambiarSemana(semanas: number): Promise<void> {
    this._comidas.set([]);
    await this.cargar(sumarDias(this._lunes(), semanas * 7));
  }

  getComida(id: string): Comida | undefined {
    return this._comidas().find((comida) => comida.id === id);
  }

  /** La comida pedida, desde memoria o desde el servidor (por ejemplo al abrir un enlace directo). */
  async obtenerComida(id: string): Promise<Comida | undefined> {
    const enMemoria = this.getComida(id);
    if (enMemoria) {
      return enMemoria;
    }
    try {
      return this.aComida(await firstValueFrom(this.http.get<ComidaApi>(`${this.baseUrl}/${id}`)));
    } catch {
      return undefined;
    }
  }

  async crearComida(datos: NuevaComida): Promise<Comida> {
    const creada = await firstValueFrom(
      this.http.post<ComidaApi>(this.baseUrl, {
        nombre: datos.nombre,
        tipo: datos.tipo.toLowerCase(),
        diaSemana: diaAApi(datos.dia),
        semana: this._lunes(),
        notas: datos.notas,
        ingredientes: (datos.ingredientes ?? []).map(ingredienteAApi),
      }),
    );
    if (datos.foto) {
      this.fotos.set(creada.id, datos.foto);
    }
    const comida = this.aComida(creada);
    this._comidas.update((comidas) => [...comidas, comida]);
    return comida;
  }

  /** Guarda nombre, tipo, día o notas de una comida existente. */
  async guardarCambios(
    id: string,
    cambios: { nombre?: string; tipo?: string; dia?: string; notas?: string },
  ): Promise<Comida> {
    const actualizada = await firstValueFrom(
      this.http.patch<ComidaApi>(`${this.baseUrl}/${id}`, {
        nombre: cambios.nombre,
        tipo: cambios.tipo?.toLowerCase(),
        diaSemana: cambios.dia ? diaAApi(cambios.dia) : undefined,
        notas: cambios.notas,
      }),
    );
    return this.reemplazar(actualizada);
  }

  /** Agrega un ingrediente a una comida ya cargada; devuelve la comida actualizada. */
  agregarIngrediente(comida: Comida, ingrediente: { nombre: string; cantidad: string }): Promise<Comida> {
    const actuales = comida.ingredientes.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad }));
    return this.reemplazarIngredientes(comida.id, [...actuales, ingrediente]);
  }

  /** Quita un ingrediente de una comida ya cargada; devuelve la comida actualizada. */
  eliminarIngrediente(comida: Comida, ingredienteId: string): Promise<Comida> {
    const restantes = comida.ingredientes
      .filter((i) => i.id !== ingredienteId)
      .map((i) => ({ nombre: i.nombre, cantidad: i.cantidad }));
    return this.reemplazarIngredientes(comida.id, restantes);
  }

  /** Repite una comida de la semana en otro día y tipo, con los mismos ingredientes. */
  reutilizarComida(guardada: ComidaGuardada, dia: string, tipo: string): Promise<Comida> {
    return this.crearComida({
      nombre: guardada.nombre,
      dia,
      tipo,
      foto: guardada.foto,
      notas: guardada.notas,
      ingredientes: guardada.ingredientes.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad })),
    });
  }

  async eliminarComida(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
    this.fotos.delete(id);
    this._comidas.update((comidas) => comidas.filter((comida) => comida.id !== id));
  }

  /** Asocia la foto elegida a una comida (solo en este dispositivo). */
  setFoto(id: string, foto: string): void {
    this.fotos.set(id, foto);
    this._comidas.update((comidas) => comidas.map((c) => (c.id === id ? { ...c, foto } : c)));
  }

  private async reemplazarIngredientes(
    comidaId: string,
    ingredientes: { nombre: string; cantidad: string }[],
  ): Promise<Comida> {
    const actualizada = await firstValueFrom(
      this.http.patch<ComidaApi>(`${this.baseUrl}/${comidaId}`, {
        ingredientes: ingredientes.map(ingredienteAApi),
      }),
    );
    return this.reemplazar(actualizada);
  }

  private reemplazar(api: ComidaApi): Comida {
    const comida = this.aComida(api);
    this._comidas.update((comidas) => comidas.map((c) => (c.id === comida.id ? comida : c)));
    return comida;
  }

  private aComida(api: ComidaApi): Comida {
    return {
      id: api.id,
      nombre: api.nombre,
      tipo: capitalizar(api.tipo),
      dia: diaDeApi(api.diaSemana),
      notas: api.notas ?? undefined,
      foto: this.fotos.get(api.id),
      ingredientes: api.ingredientes.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        cantidad: formatearCantidad(i.cantidad, i.unidad),
      })),
    };
  }
}
