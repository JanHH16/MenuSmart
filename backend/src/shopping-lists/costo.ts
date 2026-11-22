import { ComparacionTermino, PrecioTienda } from '../prices/compare';
import { Tienda, TIENDAS } from '../python-client/scrape.types';

export interface ItemParaCosto {
  id: string;
  cantidad: number;
  unidad: string;
  terminoCatalogo: string | null;
}

/**
 * Por que un item no tiene precio en una tienda:
 * - `sin_termino`: el ingrediente no se pudo mapear al catalogo de precios.
 * - `sin_precio_en_tienda`: esa tienda no tiene un producto disponible para el termino.
 * - `unidad_no_comparable`: la unidad del item no coincide con la del precio (kg contra un).
 */
export type MotivoSinPrecio = 'sin_termino' | 'sin_precio_en_tienda' | 'unidad_no_comparable';

export interface CostoEnTienda {
  total: number;
  producto: string;
  precioUnitario: number;
  unidad: string;
  desactualizado: boolean;
  url: string | null;
}

export interface CostoItem {
  tiendas: Record<Tienda, CostoEnTienda | null>;
  motivoSinPrecio: Partial<Record<Tienda, MotivoSinPrecio>>;
}

export interface ResumenCosto {
  itemsTotal: number;
  /** Items con precio en AMBAS tiendas: la unica base justa para comparar totales. */
  itemsComparables: number;
  itemsSinPrecio: number;
  comparable: {
    totales: Record<Tienda, number>;
    masBarata: Tienda | 'empate';
    ahorro: number;
  } | null;
}

function costoEnTienda(
  item: ItemParaCosto,
  precio: PrecioTienda | null | undefined,
): { costo: CostoEnTienda } | { motivo: MotivoSinPrecio } {
  if (!item.terminoCatalogo) return { motivo: 'sin_termino' };
  if (!precio) return { motivo: 'sin_precio_en_tienda' };
  if (precio.precioUnitario === null || precio.unidad !== item.unidad) {
    return { motivo: 'unidad_no_comparable' };
  }
  return {
    costo: {
      total: Math.round(precio.precioUnitario * item.cantidad),
      producto: precio.nombre,
      precioUnitario: precio.precioUnitario,
      unidad: precio.unidad,
      desactualizado: precio.desactualizado,
      url: precio.url,
    },
  };
}

/**
 * Estima el costo de cada item en cada tienda a partir del mejor producto de cada termino
 * (menor precio unitario). Nunca inventa precios: si no se puede valorizar, informa el motivo.
 * Los totales por tienda se suman solo sobre los items que tienen precio en las dos tiendas.
 */
export function calcularCostos(
  items: ItemParaCosto[],
  comparaciones: ComparacionTermino[],
): { porItem: Map<string, CostoItem>; resumen: ResumenCosto } {
  const porTermino = new Map(comparaciones.map((c) => [c.termino, c]));
  const porItem = new Map<string, CostoItem>();
  const totales = Object.fromEntries(TIENDAS.map((t) => [t, 0])) as Record<Tienda, number>;
  let comparables = 0;

  for (const item of items) {
    const comparacion = item.terminoCatalogo ? porTermino.get(item.terminoCatalogo) : undefined;
    const costoItem: CostoItem = {
      tiendas: Object.fromEntries(TIENDAS.map((t) => [t, null])) as CostoItem['tiendas'],
      motivoSinPrecio: {},
    };
    for (const tienda of TIENDAS) {
      const resultado = costoEnTienda(item, comparacion?.tiendas[tienda]);
      if ('costo' in resultado) costoItem.tiendas[tienda] = resultado.costo;
      else costoItem.motivoSinPrecio[tienda] = resultado.motivo;
    }
    porItem.set(item.id, costoItem);

    if (TIENDAS.every((tienda) => costoItem.tiendas[tienda])) {
      comparables += 1;
      for (const tienda of TIENDAS) totales[tienda] += costoItem.tiendas[tienda]?.total ?? 0;
    }
  }

  let comparable: ResumenCosto['comparable'] = null;
  if (comparables > 0) {
    const [a, b] = TIENDAS;
    const masBarata = totales[a] === totales[b] ? 'empate' : totales[a] < totales[b] ? a : b;
    comparable = {
      totales,
      masBarata,
      ahorro: Math.abs(totales[a] - totales[b]),
    };
  }

  return {
    porItem,
    resumen: {
      itemsTotal: items.length,
      itemsComparables: comparables,
      itemsSinPrecio: items.length - comparables,
      comparable,
    },
  };
}
