import { FilaPrecio } from '../prices/compare';
import { Tienda } from '../python-client/scrape.types';
import { calcularCostos, ItemParaCosto } from './costo';

const AHORA = new Date('2026-11-22T12:00:00.000Z');

function fila(
  consulta: string,
  supermercado: Tienda,
  nombre: string,
  precioUnitario: number | null,
  unidad: string | null = 'kg',
  extra: Partial<FilaPrecio> = {},
): FilaPrecio {
  return {
    productoId: nombre,
    supermercado,
    precio: 1000,
    precioUnitario,
    disponible: true,
    urlProducto: `https://tienda.cl/${nombre}`,
    fechaObtencion: new Date('2026-11-22T10:00:00.000Z'),
    consulta,
    slug: nombre,
    nombre,
    marca: null,
    imagenUrl: null,
    cantidad: 1,
    unidad,
    ...extra,
  };
}

const item = (
  id: string,
  terminoCatalogo: string | null,
  cantidad: number,
  unidad = 'kg',
): ItemParaCosto => ({ id, cantidad, unidad, terminoCatalogo });

const calcular = (items: ItemParaCosto[], filas: FilaPrecio[]) =>
  calcularCostos(items, filas, AHORA, 48);

describe('calcularCostos', () => {
  it('multiplica el precio unitario por la cantidad y suma los items comparables', () => {
    const { porItem, resumen } = calcular(
      [item('1', 'arroz', 2), item('2', 'pollo', 0.5)],
      [
        fila('arroz', 'jumbo', 'Arroz J', 1500),
        fila('arroz', 'santa_isabel', 'Arroz S', 1200),
        fila('pollo', 'jumbo', 'Pollo J', 4000),
        fila('pollo', 'santa_isabel', 'Pollo S', 4400),
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

  it('elige el producto más barato entre los que están en la misma unidad que el item', () => {
    const { porItem } = calcular(
      [item('1', 'pollo', 1)],
      [
        // Un precio por unidad, mucho más bajo, no sirve para un item en kg.
        fila('pollo', 'jumbo', 'Pollo trozado unidad', 1516, 'un'),
        fila('pollo', 'jumbo', 'Pollo entero kg', 3990, 'kg'),
        fila('pollo', 'jumbo', 'Pollo premium kg', 5200, 'kg'),
        fila('pollo', 'santa_isabel', 'Pollo S', 3890, 'kg'),
      ],
    );
    expect(porItem.get('1')?.tiendas.jumbo).toMatchObject({
      producto: 'Pollo entero kg',
      total: 3990,
      unidad: 'kg',
    });
  });

  it('descarta productos que no son el ingrediente aunque salgan más baratos', () => {
    const { porItem } = calcular(
      [item('1', 'tomate', 1)],
      [
        fila('tomate', 'jumbo', 'Puré de Tomate Passata', 900),
        fila('tomate', 'jumbo', 'Tomate Larga Vida', 2090),
        fila('tomate', 'santa_isabel', 'Corazón Costina', 500),
      ],
    );
    expect(porItem.get('1')?.tiendas.jumbo?.producto).toBe('Tomate Larga Vida');
    // Santa Isabel solo tiene un producto que no es tomate: no se inventa un precio.
    expect(porItem.get('1')?.motivoSinPrecio.santa_isabel).toBe('sin_precio_en_tienda');
  });

  it('ignora los productos no disponibles', () => {
    const { porItem } = calcular(
      [item('1', 'arroz', 1)],
      [
        fila('arroz', 'jumbo', 'Arroz agotado', 500, 'kg', { disponible: false }),
        fila('arroz', 'jumbo', 'Arroz J', 900),
        fila('arroz', 'santa_isabel', 'Arroz S', 950),
      ],
    );
    expect(porItem.get('1')?.tiendas.jumbo?.producto).toBe('Arroz J');
  });

  it('marca como desactualizado un precio más viejo que el límite', () => {
    const viejo = fila('arroz', 'jumbo', 'Arroz J', 1000, 'kg', {
      fechaObtencion: new Date('2026-11-18T12:00:00.000Z'),
    });
    const { porItem } = calcular(
      [item('1', 'arroz', 1)],
      [viejo, fila('arroz', 'santa_isabel', 'Arroz S', 900)],
    );
    expect(porItem.get('1')?.tiendas.jumbo?.desactualizado).toBe(true);
    expect(porItem.get('1')?.tiendas.santa_isabel?.desactualizado).toBe(false);
  });

  it('no inventa precios: explica por qué un item no se pudo valorizar', () => {
    const { porItem, resumen } = calcular(
      [
        item('1', null, 1),
        item('2', 'palta', 1),
        item('3', 'huevos', 12, 'un'),
        item('4', 'arroz', 1),
      ],
      [
        fila('palta', 'jumbo', 'Palta J', 5000),
        fila('huevos', 'jumbo', 'Huevos J', 200, 'kg'),
        fila('huevos', 'santa_isabel', 'Huevos S', 190, 'un'),
        fila('arroz', 'jumbo', 'Arroz J', 1000),
        fila('arroz', 'santa_isabel', 'Arroz S', 900),
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
    const { porItem } = calcular(
      [item('1', 'arroz', 1)],
      [fila('arroz', 'jumbo', 'Arroz J', null), fila('arroz', 'santa_isabel', 'Arroz S', 900)],
    );
    expect(porItem.get('1')?.motivoSinPrecio.jumbo).toBe('unidad_no_comparable');
  });

  it('declara empate cuando las dos tiendas suman lo mismo', () => {
    const { resumen } = calcular(
      [item('1', 'arroz', 1)],
      [fila('arroz', 'jumbo', 'Arroz A', 1000), fila('arroz', 'santa_isabel', 'Arroz B', 1000)],
    );
    expect(resumen.comparable).toMatchObject({ masBarata: 'empate', ahorro: 0 });
  });

  it('sin items comparables no hay total que comparar', () => {
    const { resumen } = calcular([item('1', null, 1)], []);
    expect(resumen.comparable).toBeNull();
    expect(resumen.itemsSinPrecio).toBe(1);
  });
});
