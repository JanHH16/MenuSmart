import { ComparacionTermino, PrecioTienda } from '../prices/compare';
import { calcularCostos, ItemParaCosto } from './costo';

function precio(nombre: string, precioUnitario: number | null, unidad = 'kg'): PrecioTienda {
  return {
    slug: nombre,
    nombre,
    marca: null,
    imagenUrl: null,
    precio: 1000,
    precioUnitario,
    unidad,
    cantidad: 1,
    url: `https://tienda.cl/${nombre}`,
    disponible: true,
    fechaObtencion: '2026-11-21T12:00:00.000Z',
    desactualizado: false,
  };
}

function termino(
  nombre: string,
  jumbo: PrecioTienda | null,
  santaIsabel: PrecioTienda | null,
): ComparacionTermino {
  return {
    termino: nombre,
    tiendas: { jumbo, santa_isabel: santaIsabel },
    masBarata: null,
    diferenciaUnitaria: null,
  };
}

const item = (id: string, terminoCatalogo: string | null, cantidad: number, unidad = 'kg'): ItemParaCosto => ({
  id,
  cantidad,
  unidad,
  terminoCatalogo,
});

describe('calcularCostos', () => {
  it('multiplica el precio unitario por la cantidad y suma los items comparables', () => {
    const { porItem, resumen } = calcularCostos(
      [item('1', 'arroz', 2), item('2', 'pollo', 0.5)],
      [
        termino('arroz', precio('Arroz J', 1500), precio('Arroz S', 1200)),
        termino('pollo', precio('Pollo J', 4000), precio('Pollo S', 4400)),
      ],
    );

    expect(porItem.get('1')?.tiendas.jumbo?.total).toBe(3000);
    expect(porItem.get('1')?.tiendas.santa_isabel?.total).toBe(2400);
    expect(resumen.comparable).toEqual({
      totales: { jumbo: 5000, santa_isabel: 4600 },
      masBarata: 'santa_isabel',
      ahorro: 400,
    });
    expect(resumen).toMatchObject({ itemsTotal: 2, itemsComparables: 2, itemsSinPrecio: 0 });
  });

  it('informa el producto usado y si su precio esta desactualizado', () => {
    const viejo = { ...precio('Arroz J', 1000), desactualizado: true };
    const { porItem } = calcularCostos(
      [item('1', 'arroz', 1)],
      [termino('arroz', viejo, precio('Arroz S', 900))],
    );
    expect(porItem.get('1')?.tiendas.jumbo).toMatchObject({
      producto: 'Arroz J',
      desactualizado: true,
      precioUnitario: 1000,
    });
  });

  it('no inventa precios: explica por que un item no se pudo valorizar', () => {
    const { porItem, resumen } = calcularCostos(
      [
        item('1', null, 1),
        item('2', 'palta', 1),
        item('3', 'huevos', 12, 'un'),
        item('4', 'arroz', 1),
      ],
      [
        termino('palta', precio('Palta J', 5000), null),
        termino('huevos', precio('Huevos J', 200, 'kg'), precio('Huevos S', 190, 'un')),
        termino('arroz', precio('Arroz J', 1000), precio('Arroz S', 900)),
      ],
    );

    expect(porItem.get('1')?.motivoSinPrecio).toEqual({
      jumbo: 'sin_termino',
      santa_isabel: 'sin_termino',
    });
    expect(porItem.get('2')?.motivoSinPrecio).toEqual({ santa_isabel: 'sin_precio_en_tienda' });
    expect(porItem.get('2')?.tiendas.jumbo?.total).toBe(5000);
    expect(porItem.get('3')?.motivoSinPrecio).toEqual({ jumbo: 'unidad_no_comparable' });
    expect(resumen).toMatchObject({ itemsTotal: 4, itemsComparables: 1, itemsSinPrecio: 3 });
    // El total solo suma el item con precio en las dos tiendas.
    expect(resumen.comparable?.totales).toEqual({ jumbo: 1000, santa_isabel: 900 });
  });

  it('trata como no comparable un precio sin unitario', () => {
    const { porItem } = calcularCostos(
      [item('1', 'arroz', 1)],
      [termino('arroz', precio('Arroz J', null), precio('Arroz S', 900))],
    );
    expect(porItem.get('1')?.motivoSinPrecio.jumbo).toBe('unidad_no_comparable');
  });

  it('declara empate cuando las dos tiendas suman lo mismo', () => {
    const { resumen } = calcularCostos(
      [item('1', 'arroz', 1)],
      [termino('arroz', precio('A', 1000), precio('B', 1000))],
    );
    expect(resumen.comparable).toMatchObject({ masBarata: 'empate', ahorro: 0 });
  });

  it('sin items comparables no hay total que comparar', () => {
    const { resumen } = calcularCostos([item('1', null, 1)], []);
    expect(resumen.comparable).toBeNull();
    expect(resumen.itemsSinPrecio).toBe(1);
  });
});
