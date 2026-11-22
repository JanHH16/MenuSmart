import { TERMINOS } from '../prices/catalogo';
import { FilaPrecio } from '../prices/compare';
import { Tienda } from '../python-client/scrape.types';
import { Receta, RECETAS } from './recetas';
import {
  Candidata,
  costoDeReceta,
  metricasDeMenu,
  ordenBase,
  pesosDesdeCosto,
  puntuar,
} from './scoring';

const AHORA = new Date('2026-11-22T12:00:00.000Z');

function fila(
  consulta: string,
  supermercado: Tienda,
  unidad: string,
  precioUnitario: number,
): FilaPrecio {
  return {
    productoId: `${consulta}-${supermercado}`,
    supermercado,
    precio: precioUnitario,
    precioUnitario,
    disponible: true,
    urlProducto: null,
    fechaObtencion: new Date('2026-11-22T10:00:00.000Z'),
    consulta,
    slug: `${consulta}-${supermercado}`,
    nombre: `${consulta} ${supermercado}`,
    marca: null,
    imagenUrl: null,
    cantidad: 1,
    unidad,
  };
}

/** Precios de ambas tiendas para un termino; Santa Isabel un 10% mas caro. */
function precios(lista: [string, string, number][]): FilaPrecio[] {
  return lista.flatMap(([termino, unidad, unitario]) => [
    fila(termino, 'jumbo', unidad, unitario),
    fila(termino, 'santa_isabel', unidad, Math.round(unitario * 1.1)),
  ]);
}

const receta = (id: string, ingredientes: Receta['ingredientes'], porciones = 2): Receta => ({
  id,
  nombre: id,
  tipo: 'almuerzo',
  porciones,
  ingredientes,
});

const barata = receta('barata', [{ termino: 'arroz', cantidad: 1, unidad: 'kg' }]);
const cara = receta('cara', [{ termino: 'salmon', cantidad: 1, unidad: 'kg' }]);
const filas = precios([
  ['arroz', 'kg', 1000],
  ['salmon', 'kg', 10000],
  ['cebolla', 'kg', 2000],
  ['papa', 'kg', 1000],
]);

const candidata = (r: Receta): Candidata => ({
  receta: r,
  costo: costoDeReceta(r, filas, AHORA, 48),
});

describe('costoDeReceta', () => {
  it('suma los ingredientes con la tienda más barata y reparte por porción', () => {
    const costo = costoDeReceta(
      receta('x', [
        { termino: 'arroz', cantidad: 2, unidad: 'kg' },
        { termino: 'cebolla', cantidad: 0.5, unidad: 'kg' },
      ]),
      filas,
      AHORA,
      48,
    );
    expect(costo.total).toBe(3000); // 2 x 1000 + 0,5 x 2000, todo en Jumbo
    expect(costo.porPorcion).toBe(1500);
    expect(costo.porTienda.jumbo).toBe(3000);
    expect(costo.porTienda.santa_isabel).toBe(3300);
    expect(costo.cobertura).toBe(1);
    expect(costo.sinPrecio).toEqual([]);
  });

  it('informa los ingredientes sin precio y no compra todo en una tienda a la que le falta uno', () => {
    const costo = costoDeReceta(
      receta('x', [
        { termino: 'arroz', cantidad: 1, unidad: 'kg' },
        { termino: 'palta', cantidad: 1, unidad: 'kg' },
      ]),
      filas,
      AHORA,
      48,
    );
    expect(costo.sinPrecio).toEqual(['palta']);
    expect(costo.cobertura).toBe(0.5);
    expect(costo.total).toBe(1000);
    expect(costo.porTienda.jumbo).toBeNull();
  });

  it('sin ningún precio no hay costo', () => {
    const costo = costoDeReceta(receta('x', [{ termino: 'palta', cantidad: 1, unidad: 'kg' }]), [], AHORA, 48);
    expect(costo.total).toBeNull();
    expect(costo.porPorcion).toBeNull();
  });
});

describe('pesosDesdeCosto', () => {
  it('reparte la importancia entre costo y reutilización', () => {
    expect(pesosDesdeCosto(60)).toEqual({ costo: 0.6, reuso: 0.4 });
    expect(pesosDesdeCosto(100)).toEqual({ costo: 1, reuso: 0 });
    expect(pesosDesdeCosto(250)).toEqual({ costo: 1, reuso: 0 });
  });
});

describe('puntuar', () => {
  it('con peso total al costo, la receta más barata va primero y la explicación lo dice', () => {
    const [primera, segunda] = puntuar([candidata(cara), candidata(barata)], new Set(), pesosDesdeCosto(100));
    expect(primera.receta.id).toBe('barata');
    expect(segunda.receta.id).toBe('cara');
    expect(primera.explicacion[0]).toContain('menos que el promedio');
    expect(segunda.explicacion[0]).toContain('más que el promedio');
  });

  it('con peso total a la reutilización, gana la receta que comparte ingredientes con el plan', () => {
    const conPapa = receta('con-papa', [
      { termino: 'papa', cantidad: 2, unidad: 'kg' },
      { termino: 'cebolla', cantidad: 1, unidad: 'kg' },
    ]);
    const sinCompartir = receta('sin-compartir', [{ termino: 'arroz', cantidad: 0.1, unidad: 'kg' }]);
    const ranking = puntuar(
      [candidata(sinCompartir), candidata(conPapa)],
      new Set(['papa', 'cebolla']),
      pesosDesdeCosto(0),
    );
    expect(ranking[0].receta.id).toBe('con-papa');
    expect(ranking[0].ingredientesCompartidos).toEqual(['papa', 'cebolla']);
    expect(ranking[0].ingredientesNuevos).toEqual([]);
    expect(ranking[0].explicacion.join(' ')).toContain('Reutiliza 2 de 2 ingredientes');
    expect(ranking[1].explicacion.join(' ')).toContain('No comparte ingredientes');
  });

  it('avisa cuando todavía no hay plan para medir la reutilización', () => {
    const [unica] = puntuar([candidata(barata)], new Set(), pesosDesdeCosto(60));
    expect(unica.explicacion.join(' ')).toContain('Aún no tienes comidas');
  });

  it('manda al final, con aviso, las recetas sin precios suficientes', () => {
    const sinPrecios = receta('sin-precios', [
      { termino: 'palta', cantidad: 1, unidad: 'kg' },
      { termino: 'limon', cantidad: 1, unidad: 'kg' },
    ]);
    const ranking = puntuar([candidata(sinPrecios), candidata(cara)], new Set(), pesosDesdeCosto(60));
    expect(ranking.map((r) => r.receta.id)).toEqual(['cara', 'sin-precios']);
    expect(ranking[1].explicacion[0]).toContain('No hay precios suficientes');
  });

  it('es determinista: a igual puntaje desempata por nombre', () => {
    const a = receta('a-receta', [{ termino: 'arroz', cantidad: 1, unidad: 'kg' }]);
    const b = receta('b-receta', [{ termino: 'arroz', cantidad: 1, unidad: 'kg' }]);
    const ranking = puntuar([candidata(b), candidata(a)], new Set(), pesosDesdeCosto(60));
    expect(ranking.map((r) => r.receta.id)).toEqual(['a-receta', 'b-receta']);
  });
});

describe('ordenBase', () => {
  it('ordena alfabéticamente sin mirar precios', () => {
    expect(ordenBase([candidata(cara), candidata(barata)]).map((c) => c.receta.id)).toEqual([
      'barata',
      'cara',
    ]);
  });
});

describe('metricasDeMenu', () => {
  it('calcula costo por porción, canasta (sumando repetidos) e ingredientes de uso único', () => {
    const a = receta('a', [
      { termino: 'papa', cantidad: 1, unidad: 'kg' },
      { termino: 'cebolla', cantidad: 0.5, unidad: 'kg' },
    ]);
    const b = receta('b', [
      { termino: 'papa', cantidad: 1, unidad: 'kg' },
      { termino: 'arroz', cantidad: 1, unidad: 'kg' },
    ]);
    const metricas = metricasDeMenu([candidata(a), candidata(b)], filas, AHORA, 48);
    expect(metricas.ingredientesDistintos).toBe(3);
    expect(metricas.proporcionUsoUnico).toBe(0.67); // cebolla y arroz, una sola vez cada uno
    expect(metricas.costoCanasta).toBe(2 * 1000 + 0.5 * 2000 + 1000);
    expect(metricas.costoPromedioPorPorcion).toBe(1000);
  });
});

describe('catálogo de recetas', () => {
  it('usa solo términos del catálogo de precios y cantidades positivas', () => {
    for (const r of RECETAS) {
      expect(r.ingredientes.length).toBeGreaterThan(0);
      for (const i of r.ingredientes) {
        expect(TERMINOS).toContain(i.termino);
        expect(i.cantidad).toBeGreaterThan(0);
      }
    }
  });

  it('tiene ids únicos', () => {
    expect(new Set(RECETAS.map((r) => r.id)).size).toBe(RECETAS.length);
  });
});
