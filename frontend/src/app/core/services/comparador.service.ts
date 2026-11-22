import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, switchMap, takeWhile, timer } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PrecioProducto {
  producto: string;
  cantidad: string;
  /** Un precio por tienda, en el mismo orden que `ComparadorService.tiendas`. */
  precios: number[];
  slug?: string;
  /** El precio de alguna tienda es más antiguo que el límite del backend. */
  desactualizado?: boolean;
}

export type EstadoComparador = 'cargando' | 'listo' | 'error';

export interface UltimaActualizacion {
  jumbo: Date | null;
  santaIsabel: Date | null;
}

interface PrecioTiendaApi {
  precio: number;
  desactualizado: boolean;
}

interface ProductoComunApi {
  slug: string;
  nombre: string;
  unidad: string | null;
  cantidad: number | null;
  tiendas: { jumbo: PrecioTiendaApi; santa_isabel: PrecioTiendaApi };
}

interface ComparacionApi {
  ultimaActualizacion: { jumbo: string | null; santa_isabel: string | null };
  comunes: ProductoComunApi[];
}

interface CorridaApi {
  id: string;
  estado: 'en_curso' | 'ok' | 'parcial' | 'fallido';
}

/** Cuántos productos idénticos en ambas tiendas arma la boleta. */
const LIMITE_PRODUCTOS = 12;
const INTERVALO_SONDEO_MS = 3000;
const MAX_SONDEOS = 60;

const UNIDADES: Record<string, string> = { kg: 'kg', l: 'L', un: 'unid.' };

function formatearCantidad(cantidad: number | null, unidad: string | null): string {
  if (cantidad === null || unidad === null) {
    return '';
  }
  return `${cantidad.toLocaleString('es-CL')} ${UNIDADES[unidad] ?? unidad}`;
}

/**
 * Boleta comparativa con precios reales: productos idénticos (mismo producto) que se
 * venden en Jumbo y Santa Isabel, según el último dato obtenido por el backend.
 */
@Injectable({ providedIn: 'root' })
export class ComparadorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/prices`;

  readonly tiendas = ['Jumbo', 'Santa Isabel'];

  private readonly _productos = signal<PrecioProducto[]>([]);
  private readonly _estado = signal<EstadoComparador>('cargando');
  private readonly _ultimaActualizacion = signal<UltimaActualizacion>({
    jumbo: null,
    santaIsabel: null,
  });
  private readonly _actualizando = signal(false);
  private readonly _mensaje = signal<string | null>(null);

  readonly productos = this._productos.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly ultimaActualizacion = this._ultimaActualizacion.asReadonly();
  readonly actualizando = this._actualizando.asReadonly();
  /** Resultado de la última acción de actualizar (aviso o error), para mostrar al usuario. */
  readonly mensaje = this._mensaje.asReadonly();

  readonly totales = computed(() =>
    this.tiendas.map((_, i) =>
      this._productos().reduce((total, producto) => total + producto.precios[i], 0),
    ),
  );

  /** `indice` es null si las dos tiendas suman lo mismo. */
  readonly tiendaMasBarata = computed<{ indice: number | null; ahorro: number }>(() => {
    const totales = this.totales();
    const menor = Math.min(...totales);
    const mayor = Math.max(...totales);
    const ganadoras = totales.filter((total) => total === menor).length;
    return { indice: ganadoras === 1 ? totales.indexOf(menor) : null, ahorro: mayor - menor };
  });

  readonly hayDesactualizados = computed(() =>
    this._productos().some((producto) => producto.desactualizado),
  );

  /** Pide al backend la última comparación guardada. Si falla, conserva lo que ya se mostraba. */
  cargar(): void {
    if (this._productos().length === 0) {
      this._estado.set('cargando');
    }
    this.http
      .get<ComparacionApi>(`${this.baseUrl}/compare`, {
        params: { limiteComunes: LIMITE_PRODUCTOS },
      })
      .subscribe({
        next: (respuesta) => {
          this._productos.set(respuesta.comunes.map((comun) => this.aProducto(comun)));
          this._ultimaActualizacion.set({
            jumbo: this.aFecha(respuesta.ultimaActualizacion.jumbo),
            santaIsabel: this.aFecha(respuesta.ultimaActualizacion.santa_isabel),
          });
          this._estado.set('listo');
        },
        error: () => this._estado.set(this._productos().length > 0 ? 'listo' : 'error'),
      });
  }

  /**
   * Pide al backend obtener precios nuevos (corre en segundo plano), espera a que termine
   * consultando el avance y recién entonces vuelve a cargar la comparación.
   */
  actualizar(): void {
    if (this._actualizando()) {
      return;
    }
    this._actualizando.set(true);
    this._mensaje.set(null);

    this.http.post<CorridaApi[]>(`${this.baseUrl}/refresh`, {}).subscribe({
      next: (corridas) => this.esperarCorridas(corridas.map((corrida) => corrida.id)),
      error: (error: unknown) => {
        this._mensaje.set(this.mensajeDeError(error));
        this._actualizando.set(false);
      },
    });
  }

  private esperarCorridas(ids: string[]): void {
    timer(0, INTERVALO_SONDEO_MS)
      .pipe(
        switchMap(() => this.consultarCorridas(ids)),
        takeWhile((corridas) => corridas.some((corrida) => corrida.estado === 'en_curso'), true),
      )
      .subscribe({
        next: (corridas) => {
          if (corridas.some((corrida) => corrida.estado === 'en_curso')) {
            return;
          }
          this.terminarActualizacion(corridas);
        },
        error: () => {
          this._mensaje.set('No se pudo consultar el avance de la actualización.');
          this._actualizando.set(false);
        },
      });
  }

  private consultarCorridas(ids: string[]): Observable<CorridaApi[]> {
    return forkJoin(ids.map((id) => this.http.get<CorridaApi>(`${this.baseUrl}/runs/${id}`)));
  }

  private terminarActualizacion(corridas: CorridaApi[]): void {
    const fallidas = corridas.filter((corrida) => corrida.estado === 'fallido').length;
    if (fallidas === corridas.length) {
      this._mensaje.set('No se pudieron obtener precios nuevos. Se muestran los últimos datos.');
    } else if (fallidas > 0 || corridas.some((corrida) => corrida.estado === 'parcial')) {
      this._mensaje.set('La actualización quedó incompleta. Algunos precios pueden ser antiguos.');
    }
    this._actualizando.set(false);
    this.cargar();
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return 'Ya hay una actualización de precios en curso. Intenta de nuevo en unos minutos.';
      }
      if (error.status === 429) {
        const segundos = (error.error as { retryAfterSeconds?: number } | null)?.retryAfterSeconds;
        const minutos = segundos ? Math.ceil(segundos / 60) : null;
        return minutos
          ? `Los precios se actualizaron hace poco. Puedes volver a intentarlo en ${minutos} min.`
          : 'Los precios se actualizaron hace poco. Intenta de nuevo más tarde.';
      }
    }
    return 'No se pudo iniciar la actualización de precios.';
  }

  private aProducto(comun: ProductoComunApi): PrecioProducto {
    const { jumbo, santa_isabel: santaIsabel } = comun.tiendas;
    return {
      slug: comun.slug,
      producto: comun.nombre,
      cantidad: formatearCantidad(comun.cantidad, comun.unidad),
      precios: [jumbo.precio, santaIsabel.precio],
      desactualizado: jumbo.desactualizado || santaIsabel.desactualizado,
    };
  }

  private aFecha(iso: string | null): Date | null {
    return iso ? new Date(iso) : null;
  }
}
