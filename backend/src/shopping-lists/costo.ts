import { FilaPrecio } from '../prices/compare';
import { Tienda, TIENDAS } from '../python-client/scrape.types';
import { esProductoRelevante } from './relevancia';

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
 * - `unidad_no_comparable`: hay productos, pero ninguno con precio por la misma unidad que
 *   el item (se necesitan kg y solo hay precios por unidad, por ejemplo).
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

const MS_POR_HORA = 3_600_000;

/**
 * Mejor producto para un item en una tienda: entre los disponibles del termino cuyo precio
 * unitario esta en la misma unidad que el item, el de menor precio unitario. Asi un item en kg
 * nunca se valoriza con un precio por unidad.
 */
function costoEnTienda(
  item: ItemParaCosto,
  filas: FilaPrecio[],
  ahora: Date,
  horasObsoleto: number,
): { costo: CostoEnTienda } | { motivo: MotivoSinPrecio } {
  if (!item.terminoCatalogo) return { motivo: 'sin_termino' };

  const disponibles = filas.filter(
    (fila) =>
      fila.disponible && esProductoRelevante(item.terminoCatalogo ?? '', fila.nombre ?? fila.slug),
  );
  if (disponibles.length === 0) return { motivo: 'sin_precio_en_tienda' };

  const comparables = disponibles.filter(
    (fila) => fila.precioUnitario !== null && fila.unidad === item.unidad,
  );
  if (comparables.length === 0) return { motivo: 'unidad_no_comparable' };

  const mejor = [...comparables].sort(
    (a, b) => (a.precioUnitario ?? 0) - (b.precioUnitario ?? 0) || a.precio - b.precio,
  )[0];
  const precioUnitario = mejor.precioUnitario ?? 0;
  return {
    costo: {
      total: Math.round(precioUnitario * item.cantidad),
      producto: mejor.nombre ?? mejor.slug,
      precioUnitario,
      unidad: item.unidad,
      desactualizado: ahora.getTime() - mejor.fechaObtencion.getTime() > horasObsoleto * MS_POR_HORA,
      url: mejor.urlProducto,
    },
  };
}

/**
 * Estima el costo de cada item en cada tienda con los precios vigentes. Nunca inventa precios:
 * si no se puede valorizar, informa el motivo. Los totales por tienda se suman solo sobre los
 * items que tienen precio en las dos tiendas.
 */
export function calcularCostos(
  items: ItemParaCosto[],
  filas: FilaPrecio[],
  ahora: Date,
  horasObsoleto: number,
): { porItem: Map<string, CostoItem>; resumen: ResumenCosto } {
  const porItem = new Map<string, CostoItem>();
  const totales = Object.fromEntries(TIENDAS.map((t) => [t, 0])) as Record<Tienda, number>;
  let comparables = 0;

  for (const item of items) {
    const costoItem: CostoItem = {
      tiendas: Object.fromEntries(TIENDAS.map((t) => [t, null])) as CostoItem['tiendas'],
      motivoSinPrecio: {},
    };
    for (const tienda of TIENDAS) {
      const delTermino = filas.filter(
        (fila) => fila.consulta === item.terminoCatalogo && fila.supermercado === tienda,
      );
      const resultado = costoEnTienda(item, delTermino, ahora, horasObsoleto);
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
