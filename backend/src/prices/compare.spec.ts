import { FilaPrecio, construirComparacion } from './compare';

const AHORA = new Date('2026-11-21T20:00:00Z');

function fila(cambios: Partial<FilaPrecio> = {}): FilaPrecio {
  return {
    productoId: 'p1',
    supermercado: 'jumbo',
    precio: 1890,
    precioUnitario: 1890,
    disponible: true,
    urlProducto: 'https://www.jumbo.cl/arroz-1-kg/p',
    fechaObtencion: new Date('2026-11-21T19:00:00Z'),
    consulta: 'arroz',
    slug: 'arroz-1-kg',
    nombre: 'Arroz 1 kg',
    marca: 'Banquete',
    imagenUrl: null,
    cantidad: 1,
    unidad: 'kg',
    ...cambios,
  };
}

describe('construirComparacion', () => {
  it('elige el mejor producto por precio unitario en cada tienda y declara la más barata', () => {
    const filas = [
      fila({ productoId: 'a', slug: 'caro', precio: 2390, precioUnitario: 2390 }),
      fila({ productoId: 'b', slug: 'barato', precio: 1430, precioUnitario: 1430 }),
      fila({ productoId: 'c', slug: 'sa', supermercado: 'santa_isabel', precio: 990, precioUnitario: 990 }),
    ];
    const { terminos } = construirComparacion(filas, ['arroz'], AHORA, 48, 20);
    expect(terminos[0].tiendas.jumbo?.slug).toBe('barato');
    expect(terminos[0].tiendas.santa_isabel?.slug).toBe('sa');
    expect(terminos[0].masBarata).toBe('santa_isabel');
    expect(terminos[0].diferenciaUnitaria).toBe(440);
  });

  it('ignora productos agotados', () => {
    const filas = [
      fila({ slug: 'agotado', precioUnitario: 100, precio: 100, disponible: false }),
      fila({ productoId: 'b', slug: 'disponible', precioUnitario: 1500, precio: 1500 }),
    ];
    const { terminos } = construirComparacion(filas, ['arroz'], AHORA, 48, 20);
    expect(terminos[0].tiendas.jumbo?.slug).toBe('disponible');
  });

  it('sin precio unitario compara por precio del envase', () => {
    const filas = [
      fila({ productoId: 'a', slug: 'sin-unidad-caro', precio: 3000, precioUnitario: null }),
      fila({ productoId: 'b', slug: 'sin-unidad-barato', precio: 2000, precioUnitario: null }),
    ];
    const { terminos } = construirComparacion(filas, ['arroz'], AHORA, 48, 20);
    expect(terminos[0].tiendas.jumbo?.slug).toBe('sin-unidad-barato');
  });

  it('declara empate cuando el precio unitario es igual', () => {
    const filas = [
      fila(),
      fila({ productoId: 'b', slug: 'sa', supermercado: 'santa_isabel', precio: 1890 }),
    ];
    const { terminos } = construirComparacion(filas, ['arroz'], AHORA, 48, 20);
    expect(terminos[0].masBarata).toBe('empate');
    expect(terminos[0].diferenciaUnitaria).toBe(0);
  });

  it('declara no_comparable si las unidades difieren o falta el precio unitario', () => {
    const porUnidad = construirComparacion(
      [
        fila(),
        fila({ productoId: 'b', slug: 'sa', supermercado: 'santa_isabel', unidad: 'l' }),
      ],
      ['arroz'],
      AHORA,
      48,
      20,
    );
    expect(porUnidad.terminos[0].masBarata).toBe('no_comparable');

    const sinUnitario = construirComparacion(
      [
        fila(),
        fila({ productoId: 'b', slug: 'sa', supermercado: 'santa_isabel', precioUnitario: null }),
      ],
      ['arroz'],
      AHORA,
      48,
      20,
    );
    expect(sinUnitario.terminos[0].masBarata).toBe('no_comparable');
  });

  it('deja el veredicto en null cuando falta una de las tiendas', () => {
    const { terminos } = construirComparacion([fila()], ['arroz'], AHORA, 48, 20);
    expect(terminos[0].tiendas.santa_isabel).toBeNull();
    expect(terminos[0].masBarata).toBeNull();
    expect(terminos[0].diferenciaUnitaria).toBeNull();
  });

  it('marca como desactualizado un precio más viejo que el límite', () => {
    const vieja = fila({ fechaObtencion: new Date('2026-11-18T20:00:00Z') });
    const { terminos } = construirComparacion([vieja], ['arroz'], AHORA, 48, 20);
    expect(terminos[0].tiendas.jumbo?.desactualizado).toBe(true);

    const reciente = construirComparacion([fila()], ['arroz'], AHORA, 48, 20);
    expect(reciente.terminos[0].tiendas.jumbo?.desactualizado).toBe(false);
  });

  it('ignora filas de términos que no se pidieron', () => {
    const { terminos, comunes } = construirComparacion(
      [fila({ consulta: 'pollo' })],
      ['arroz'],
      AHORA,
      48,
      20,
    );
    expect(terminos).toHaveLength(1);
    expect(terminos[0].tiendas.jumbo).toBeNull();
    expect(comunes).toHaveLength(0);
  });

  describe('productos comunes', () => {
    const par = (slug: string, jumbo: number, santa: number): FilaPrecio[] => [
      fila({ productoId: `j-${slug}`, slug, precio: jumbo, precioUnitario: jumbo }),
      fila({
        productoId: `s-${slug}`,
        slug,
        supermercado: 'santa_isabel',
        precio: santa,
        precioUnitario: santa,
      }),
    ];

    it('lista solo los productos presentes en ambas tiendas, ordenados por diferencia', () => {
      const filas = [
        ...par('chico', 1000, 1100),
        ...par('grande', 2000, 3500),
        fila({ productoId: 'x', slug: 'solo-jumbo' }),
      ];
      const { comunes } = construirComparacion(filas, ['arroz'], AHORA, 48, 20);
      expect(comunes.map((c) => c.slug)).toEqual(['grande', 'chico']);
      expect(comunes[0].masBarata).toBe('jumbo');
      expect(comunes[0].diferencia).toBe(1500);
    });

    it('declara empate y respeta el límite pedido', () => {
      const filas = [...par('igual', 1000, 1000), ...par('a', 100, 900), ...par('b', 100, 500)];
      const { comunes } = construirComparacion(filas, ['arroz'], AHORA, 48, 2);
      expect(comunes).toHaveLength(2);
      expect(comunes.map((c) => c.slug)).toEqual(['a', 'b']);
      const todos = construirComparacion(filas, ['arroz'], AHORA, 48, 10).comunes;
      expect(todos.find((c) => c.slug === 'igual')?.masBarata).toBe('empate');
    });

    it('excluye los productos agotados en alguna tienda', () => {
      const filas = [
        fila({ productoId: 'j', slug: 'agotado-sa' }),
        fila({ productoId: 's', slug: 'agotado-sa', supermercado: 'santa_isabel', disponible: false }),
      ];
      expect(construirComparacion(filas, ['arroz'], AHORA, 48, 20).comunes).toHaveLength(0);
    });
  });
});
