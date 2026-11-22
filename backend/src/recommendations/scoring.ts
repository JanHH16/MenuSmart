import { FilaPrecio } from '../prices/compare';
import { Tienda, TIENDAS } from '../python-client/scrape.types';
import { calcularCostos } from '../shopping-lists/costo';
import { Receta } from './recetas';

/** Fraccion minima de ingredientes con precio para considerar valorizable una receta. */
export const COBERTURA_MINIMA = 0.7;

export interface CostoReceta {
  /** Costo de la receta usando en cada ingrediente la tienda mas barata. */
  total: number | null;
  porPorcion: number | null;
  /** Costo comprando todo en una sola tienda; null si a esa tienda le falta algun ingrediente. */
  porTienda: Record<Tienda, number | null>;
  /** Fraccion de ingredientes con precio en al menos una tienda. */
  cobertura: number;
  /** Ingredientes sin precio en ninguna tienda. */
  sinPrecio: string[];
}

export function costoDeReceta(
  receta: Receta,
  filas: FilaPrecio[],
  ahora: Date,
  horasObsoleto: number,
): CostoReceta {
  const items = receta.ingredientes.map((ingrediente) => ({
    id: ingrediente.termino,
    cantidad: ingrediente.cantidad,
    unidad: ingrediente.unidad,
    terminoCatalogo: ingrediente.termino,
  }));
  const { porItem } = calcularCostos(items, filas, ahora, horasObsoleto);

  let total = 0;
  let valorizados = 0;
  const sinPrecio: string[] = [];
  const porTienda = Object.fromEntries(TIENDAS.map((t) => [t, 0])) as Record<Tienda, number | null>;

  for (const ingrediente of receta.ingredientes) {
    const costo = porItem.get(ingrediente.termino);
    const precios = TIENDAS.map((t) => costo?.tiendas[t]?.total ?? null);
    const disponibles = precios.filter((p): p is number => p !== null);
    if (disponibles.length === 0) {
      sinPrecio.push(ingrediente.termino);
    } else {
      valorizados += 1;
      total += Math.min(...disponibles);
    }
    TIENDAS.forEach((tienda, i) => {
      const actual = porTienda[tienda];
      porTienda[tienda] = actual === null || precios[i] === null ? null : actual + (precios[i] ?? 0);
    });
  }

  const cobertura = valorizados / receta.ingredientes.length;
  return {
    total: valorizados > 0 ? Math.round(total) : null,
    porPorcion: valorizados > 0 ? Math.round(total / receta.porciones) : null,
    porTienda,
    cobertura,
    sinPrecio,
  };
}

export interface Pesos {
  costo: number;
  reuso: number;
}

/** Convierte "importancia del costo" (0 a 100) en pesos que suman 1. */
export function pesosDesdeCosto(pesoCosto: number): Pesos {
  const costo = Math.min(100, Math.max(0, pesoCosto)) / 100;
  return { costo, reuso: 1 - costo };
}

export interface Candidata {
  receta: Receta;
  costo: CostoReceta;
}

export interface Puntuada extends Candidata {
  puntaje: number;
  ingredientesCompartidos: string[];
  ingredientesNuevos: string[];
  explicacion: string[];
}

const pesos$ = (valor: number) => `$${valor.toLocaleString('es-CL')}`;

/**
 * Ordena las recetas segun dos variables: cuanto cuesta cada porcion (menos es mejor) y cuanto
 * se reutilizan ingredientes que ya estan en el plan de la semana (mas es mejor, porque se
 * compran menos productos distintos y sobra menos). Las recetas sin precios suficientes quedan
 * al final y avisan por que.
 */
export function puntuar(
  candidatas: Candidata[],
  terminosDelPlan: Set<string>,
  pesos: Pesos,
): Puntuada[] {
  const valorizables = candidatas.filter(
    (c) => c.costo.porPorcion !== null && c.costo.cobertura >= COBERTURA_MINIMA,
  );
  const costos = valorizables.map((c) => c.costo.porPorcion ?? 0);
  const minimo = Math.min(...costos);
  const maximo = Math.max(...costos);
  const promedio = costos.length ? costos.reduce((a, b) => a + b, 0) / costos.length : 0;

  const puntuadas = candidatas.map((candidata): Puntuada => {
    const terminos = candidata.receta.ingredientes.map((i) => i.termino);
    const compartidos = terminos.filter((t) => terminosDelPlan.has(t));
    const nuevos = terminos.filter((t) => !terminosDelPlan.has(t));
    const reuso = compartidos.length / terminos.length;

    const esValorizable = valorizables.includes(candidata);
    const costoNormalizado = !esValorizable
      ? 0
      : maximo === minimo
        ? 1
        : 1 - ((candidata.costo.porPorcion ?? 0) - minimo) / (maximo - minimo);
    const puntaje = esValorizable
      ? pesos.costo * costoNormalizado + pesos.reuso * reuso
      : pesos.reuso * reuso * 0.5; // sin precio confiable no compite con las valorizables

    const explicacion: string[] = [];
    if (esValorizable && candidata.costo.porPorcion !== null) {
      const diferencia = Math.round(((promedio - candidata.costo.porPorcion) / promedio) * 100);
      explicacion.push(
        diferencia >= 5
          ? `Cuesta ${pesos$(candidata.costo.porPorcion)} por porción, ${diferencia}% menos que el promedio de las recetas.`
          : diferencia <= -5
            ? `Cuesta ${pesos$(candidata.costo.porPorcion)} por porción, ${-diferencia}% más que el promedio de las recetas.`
            : `Cuesta ${pesos$(candidata.costo.porPorcion)} por porción, cerca del promedio de las recetas.`,
      );
    } else {
      explicacion.push('No hay precios suficientes para estimar su costo; se muestra al final.');
    }
    if (terminosDelPlan.size === 0) {
      explicacion.push('Aún no tienes comidas en la semana, así que no se puede medir qué ingredientes reutilizar.');
    } else if (compartidos.length > 0) {
      explicacion.push(
        `Reutiliza ${compartidos.length} de ${terminos.length} ingredientes de tu semana (${compartidos.join(', ')}), así compras menos productos distintos.`,
      );
    } else {
      explicacion.push('No comparte ingredientes con lo que ya planificaste.');
    }
    if (candidata.costo.sinPrecio.length > 0 && esValorizable) {
      explicacion.push(`Sin precio para ${candidata.costo.sinPrecio.join(', ')}: el costo es un mínimo.`);
    }

    return {
      ...candidata,
      puntaje: Math.round(puntaje * 1000) / 1000,
      ingredientesCompartidos: compartidos,
      ingredientesNuevos: nuevos,
      explicacion,
    };
  });

  return puntuadas.sort(
    (a, b) => b.puntaje - a.puntaje || a.receta.nombre.localeCompare(b.receta.nombre),
  );
}

/** Orden sin adaptación (la versión base): alfabético, ignorando precios y plan. */
export function ordenBase(candidatas: Candidata[]): Candidata[] {
  return [...candidatas].sort((a, b) => a.receta.nombre.localeCompare(b.receta.nombre));
}

export interface MetricasMenu {
  /** Costo promedio por porción de las recetas del menú (solo las valorizables). */
  costoPromedioPorPorcion: number;
  /** Costo de comprar todos los ingredientes del menú (sumando cantidades repetidas). */
  costoCanasta: number;
  ingredientesDistintos: number;
  /** Proporción de ingredientes que aparecen en una sola receta del menú. */
  proporcionUsoUnico: number;
}

/**
 * Metricas de un menu (conjunto de recetas). `proporcionUsoUnico` es un indicador indirecto de
 * desperdicio: un ingrediente que se compra para una sola receta es el que mas probable sobra.
 */
export function metricasDeMenu(
  menu: Candidata[],
  filas: FilaPrecio[],
  ahora: Date,
  horasObsoleto: number,
): MetricasMenu {
  const porPorcion = menu
    .map((c) => c.costo.porPorcion)
    .filter((v): v is number => v !== null);

  const usos = new Map<string, { cantidad: number; unidad: string; recetas: number }>();
  for (const { receta } of menu) {
    for (const ingrediente of receta.ingredientes) {
      const actual = usos.get(ingrediente.termino);
      usos.set(ingrediente.termino, {
        cantidad: (actual?.cantidad ?? 0) + ingrediente.cantidad,
        unidad: ingrediente.unidad,
        recetas: (actual?.recetas ?? 0) + 1,
      });
    }
  }
  const { porItem } = calcularCostos(
    [...usos.entries()].map(([termino, uso]) => ({
      id: termino,
      cantidad: uso.cantidad,
      unidad: uso.unidad,
      terminoCatalogo: termino,
    })),
    filas,
    ahora,
    horasObsoleto,
  );
  let costoCanasta = 0;
  for (const costo of porItem.values()) {
    const precios = TIENDAS.map((t) => costo.tiendas[t]?.total).filter(
      (v): v is number => v !== undefined,
    );
    if (precios.length > 0) costoCanasta += Math.min(...precios);
  }

  const distintos = usos.size;
  const unicos = [...usos.values()].filter((uso) => uso.recetas === 1).length;
  return {
    costoPromedioPorPorcion: porPorcion.length
      ? Math.round(porPorcion.reduce((a, b) => a + b, 0) / porPorcion.length)
      : 0,
    costoCanasta: Math.round(costoCanasta),
    ingredientesDistintos: distintos,
    proporcionUsoUnico: distintos === 0 ? 0 : Math.round((unicos / distintos) * 100) / 100,
  };
}
