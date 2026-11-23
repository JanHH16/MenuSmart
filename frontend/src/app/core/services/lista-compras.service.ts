import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { formatearCantidad } from '../utils/cantidad';
import { PlanSemanalService } from './plan-semanal.service';

export interface ItemCompra {
  id: string;
  nombre: string;
  /** Texto para mostrar, por ejemplo "0,5 kg". */
  cantidad: string;
  comprado: boolean;
  /** Costo estimado en cada tienda, o null si no se pudo valorizar. */
  costoJumbo: number | null;
  costoSantaIsabel: number | null;
  /** Como se llego a esta cantidad (nombres escritos y reglas de normalizacion). */
  nombresOriginales: string[];
  reglas: string[];
}

export interface CategoriaCompra {
  nombre: string;
  items: ItemCompra[];
}

export type EstadoLista = 'cargando' | 'sin_lista' | 'listo' | 'error';

export interface ResumenCostoLista {
  itemsTotal: number;
  itemsComparables: number;
  itemsSinPrecio: number;
  totalJumbo: number;
  totalSantaIsabel: number;
  /** null si no hay items con precio en ambas tiendas, o si empatan. */
  masBarata: 'Jumbo' | 'Santa Isabel' | null;
  ahorro: number;
}

interface CostoTiendaApi {
  total: number;
}

interface ItemApi {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria: string | null;
  comprado: boolean;
  nombresOriginales: string[];
  reglas: string[];
  costo: { tiendas: { jumbo: CostoTiendaApi | null; santa_isabel: CostoTiendaApi | null } };
}

interface ListaApi {
  id: string;
  semana: string;
  items: ItemApi[];
  resumen: {
    itemsTotal: number;
    itemsComparables: number;
    itemsSinPrecio: number;
    comparable: {
      totales: { jumbo: number; santa_isabel: number };
      masBarata: 'jumbo' | 'santa_isabel' | 'empate';
      ahorro: number;
    } | null;
  };
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Lista de compras de la semana, generada en el backend a partir del plan: ingredientes
 * normalizados y sumados, con costo estimado en cada supermercado.
 */
@Injectable({ providedIn: 'root' })
export class ListaComprasService {
  private readonly http = inject(HttpClient);
  private readonly planSemanal = inject(PlanSemanalService);
  private readonly baseUrl = `${environment.apiUrl}/shopping-lists`;

  private readonly _items = signal<(ItemCompra & { categoria: string })[]>([]);
  private readonly _resumen = signal<ResumenCostoLista | null>(null);
  private readonly _estado = signal<EstadoLista>('cargando');
  private readonly _generando = signal(false);
  private readonly _mensaje = signal<string | null>(null);

  readonly estado = this._estado.asReadonly();
  readonly generando = this._generando.asReadonly();
  readonly mensaje = this._mensaje.asReadonly();
  readonly resumen = this._resumen.asReadonly();
  readonly totalComidas = this.planSemanal.totalComidas;

  readonly categorias = computed<CategoriaCompra[]>(() => {
    const porCategoria = new Map<string, ItemCompra[]>();
    for (const item of this._items()) {
      porCategoria.set(item.categoria, [...(porCategoria.get(item.categoria) ?? []), item]);
    }
    return [...porCategoria.entries()].map(([nombre, items]) => ({ nombre, items }));
  });

  readonly totalItems = computed(() => this._items().length);
  readonly itemsComprados = computed(() => this._items().filter((item) => item.comprado).length);

  async cargar(): Promise<void> {
    if (this._items().length === 0) {
      this._estado.set('cargando');
    }
    try {
      const lista = await firstValueFrom(
        this.http.get<ListaApi>(this.baseUrl, { params: { semana: this.planSemanal.lunes() } }),
      );
      this.aplicar(lista);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this._items.set([]);
        this._resumen.set(null);
        this._estado.set('sin_lista');
      } else {
        this._estado.set(this._items().length > 0 ? 'listo' : 'error');
      }
    }
  }

  /** Vuelve a pedir la lista (con costos al día) solo si ya había una cargada. */
  async recargarSiHay(): Promise<void> {
    if (this._items().length > 0) {
      await this.cargar();
    }
  }

  /** Arma la lista desde el plan de la semana (reemplaza la anterior, conserva lo comprado). */
  async generar(): Promise<void> {
    if (this._generando()) {
      return;
    }
    this._generando.set(true);
    this._mensaje.set(null);
    try {
      const lista = await firstValueFrom(
        this.http.post<ListaApi>(`${this.baseUrl}/generate`, { semana: this.planSemanal.lunes() }),
      );
      this.aplicar(lista);
    } catch (error) {
      this._mensaje.set(this.mensajeDeError(error));
    } finally {
      this._generando.set(false);
    }
  }

  /** Marca o desmarca un item. Se ve al instante y se revierte si el servidor falla. */
  async alternarComprado(id: string): Promise<void> {
    const actual = this._items().find((item) => item.id === id);
    if (!actual) {
      return;
    }
    const comprado = !actual.comprado;
    this.actualizarItem(id, comprado);
    try {
      await firstValueFrom(this.http.patch<void>(`${this.baseUrl}/items/${id}`, { comprado }));
    } catch {
      this.actualizarItem(id, !comprado);
      this._mensaje.set('No se pudo guardar el cambio. Intenta de nuevo.');
    }
  }

  private actualizarItem(id: string, comprado: boolean): void {
    this._items.update((items) => items.map((item) => (item.id === id ? { ...item, comprado } : item)));
  }

  private aplicar(lista: ListaApi): void {
    this._items.set(
      lista.items.map((item) => ({
        id: item.id,
        nombre: capitalizar(item.nombre),
        cantidad: formatearCantidad(item.cantidad, item.unidad),
        comprado: item.comprado,
        categoria: capitalizar(item.categoria ?? 'otros'),
        costoJumbo: item.costo.tiendas.jumbo?.total ?? null,
        costoSantaIsabel: item.costo.tiendas.santa_isabel?.total ?? null,
        nombresOriginales: item.nombresOriginales,
        reglas: item.reglas,
      })),
    );
    const { resumen } = lista;
    const comparable = resumen.comparable;
    this._resumen.set({
      itemsTotal: resumen.itemsTotal,
      itemsComparables: resumen.itemsComparables,
      itemsSinPrecio: resumen.itemsSinPrecio,
      totalJumbo: comparable?.totales.jumbo ?? 0,
      totalSantaIsabel: comparable?.totales.santa_isabel ?? 0,
      masBarata:
        comparable?.masBarata === 'jumbo'
          ? 'Jumbo'
          : comparable?.masBarata === 'santa_isabel'
            ? 'Santa Isabel'
            : null,
      ahorro: comparable?.ahorro ?? 0,
    });
    this._estado.set('listo');
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 422) {
        return 'Agrega comidas con ingredientes a tu semana antes de generar la lista.';
      }
      if (error.status === 503 || error.status === 0) {
        return 'No se pudo procesar la lista ahora mismo. Intenta de nuevo en un momento.';
      }
    }
    return 'No se pudo generar la lista de compras.';
  }
}
