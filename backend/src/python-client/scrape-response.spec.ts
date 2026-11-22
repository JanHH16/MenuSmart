import { InvalidScrapeResponseError, esProductoValido, parseScrapeResponse } from './scrape-response';

const producto = (cambios: Record<string, unknown> = {}) => ({
  consulta: 'arroz',
  external_id: 'arroz-grado-1-banquete-1-kg',
  nombre: 'Arroz Grado 1 Banquete 1 kg',
  nombre_normalizado: 'arroz grado 1 banquete 1 kg',
  marca: 'Banquete',
  precio: 1890,
  moneda: 'CLP',
  cantidad: 1,
  unidad: 'kg',
  precio_unitario: 1890,
  disponible: true,
  url: 'https://www.jumbo.cl/arroz-grado-1-banquete-1-kg/p',
  imagen: 'https://jumbocl.vteximg.com.br/arroz.jpg',
  ...cambios,
});

const respuesta = (cambios: Record<string, unknown> = {}) => ({
  tienda: 'jumbo',
  estado: 'ok',
  obtenido_en: '2026-11-21T20:00:00Z',
  resultados: [producto()],
  errores: [],
  estadisticas: {
    consultas_total: 1,
    consultas_ok: 1,
    consultas_fallidas: 0,
    registros_extraidos: 1,
    registros_validos: 1,
    registros_duplicados: 0,
    registros_descartados: 0,
    descartes_por_motivo: {},
    duracion_ms: 1200,
  },
  ...cambios,
});

describe('esProductoValido', () => {
  it('acepta un producto completo y uno con campos opcionales nulos', () => {
    expect(esProductoValido(producto())).toBe(true);
    expect(
      esProductoValido(
        producto({ marca: null, cantidad: null, unidad: null, precio_unitario: null, imagen: null }),
      ),
    ).toBe(true);
  });

  it.each([
    ['precio cero', { precio: 0 }],
    ['precio negativo', { precio: -10 }],
    ['precio con decimales', { precio: 10.5 }],
    ['precio como texto', { precio: '1890' }],
    ['moneda distinta', { moneda: 'USD' }],
    ['slug inválido', { external_id: 'No Valido!' }],
    ['url sin https', { url: 'http://www.jumbo.cl/a/p' }],
    ['unidad desconocida', { unidad: 'lb' }],
    ['nombre vacío', { nombre: '  ' }],
    ['disponible no booleano', { disponible: 'si' }],
    ['imagen sin https', { imagen: 'http://x.cl/a.jpg' }],
  ])('rechaza un producto con %s', (_motivo, cambios) => {
    expect(esProductoValido(producto(cambios))).toBe(false);
  });

  it('rechaza valores que no son objetos', () => {
    expect(esProductoValido(null)).toBe(false);
    expect(esProductoValido('texto')).toBe(false);
    expect(esProductoValido([])).toBe(false);
  });
});

describe('parseScrapeResponse', () => {
  it('devuelve la respuesta validada', () => {
    const { response, invalidos } = parseScrapeResponse(respuesta());
    expect(response.resultados).toHaveLength(1);
    expect(invalidos).toBe(0);
  });

  it('descarta los registros inválidos y los cuenta', () => {
    const { response, invalidos } = parseScrapeResponse(
      respuesta({ resultados: [producto(), producto({ precio: -1 }), { basura: true }] }),
    );
    expect(response.resultados).toHaveLength(1);
    expect(invalidos).toBe(2);
  });

  it('conserva solo los errores bien formados', () => {
    const { response } = parseScrapeResponse(
      respuesta({
        errores: [{ consulta: 'arroz', tipo: 'timeout', detalle: 'lento' }, { raro: 1 }],
      }),
    );
    expect(response.errores).toEqual([{ consulta: 'arroz', tipo: 'timeout', detalle: 'lento' }]);
  });

  it.each([
    ['no es un objeto', 'hola'],
    ['tienda desconocida', respuesta({ tienda: 'lider' })],
    ['estado desconocido', respuesta({ estado: 'raro' })],
    ['fecha inválida', respuesta({ obtenido_en: 'ayer' })],
    ['sin resultados', respuesta({ resultados: undefined })],
    ['sin estadísticas', respuesta({ estadisticas: undefined })],
    [
      'estadística negativa',
      respuesta({ estadisticas: { ...respuesta().estadisticas, duracion_ms: -1 } }),
    ],
    [
      'sin descartes por motivo',
      respuesta({ estadisticas: { ...respuesta().estadisticas, descartes_por_motivo: undefined } }),
    ],
  ])('lanza error si %s', (_motivo, datos) => {
    expect(() => parseScrapeResponse(datos)).toThrow(InvalidScrapeResponseError);
  });
});
