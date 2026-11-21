import { EjecucionResumen, VENTANA_EJECUCIONES, calcularCalidad } from './calidad';

const AHORA = new Date('2026-11-21T20:00:00Z');
const sinCobertura = () => ({ jumbo: new Set<string>(), santa_isabel: new Set<string>() });

function ejecucion(cambios: Partial<EjecucionResumen> = {}): EjecucionResumen {
  return {
    tienda: 'jumbo',
    estado: 'ok',
    iniciadaEn: new Date('2026-11-21T18:00:00Z'),
    finalizadaEn: new Date('2026-11-21T18:02:00Z'),
    consultasTotal: 30,
    consultasOk: 30,
    consultasFallidas: 0,
    registrosExtraidos: 100,
    registrosValidos: 90,
    registrosDuplicados: 6,
    registrosDescartados: 4,
    duracionMs: 60_000,
    ...cambios,
  };
}

describe('calcularCalidad', () => {
  it('calcula los porcentajes de registros y la tasa de errores', () => {
    const calidad = calcularCalidad(
      [ejecucion({ consultasFallidas: 3, consultasOk: 27 })],
      sinCobertura(),
      30,
      AHORA,
    );
    const jumbo = calidad.tiendas.jumbo;
    expect(jumbo.porcentajeValidos).toBe(90);
    expect(jumbo.porcentajeDuplicados).toBe(6);
    expect(jumbo.porcentajeDescartados).toBe(4);
    expect(jumbo.tasaErroresConsultas).toBe(10);
    expect(jumbo.duracionPromedioMs).toBe(60_000);
  });

  it('informa la actualidad desde la última ejecución exitosa', () => {
    const calidad = calcularCalidad(
      [
        ejecucion({ estado: 'fallido', iniciadaEn: new Date('2026-11-21T19:00:00Z'), finalizadaEn: new Date('2026-11-21T19:01:00Z') }),
        ejecucion({ estado: 'parcial' }),
      ],
      sinCobertura(),
      30,
      AHORA,
    );
    expect(calidad.tiendas.jumbo.ultimaActualizacion).toBe('2026-11-21T18:02:00.000Z');
    expect(calidad.tiendas.jumbo.horasDesdeActualizacion).toBe(2);
    expect(calidad.tiendas.jumbo.ultimaEjecucion?.estado).toBe('fallido');
  });

  it('ignora las ejecuciones en curso y las de otra tienda', () => {
    const calidad = calcularCalidad(
      [ejecucion({ estado: 'en_curso', finalizadaEn: null }), ejecucion({ tienda: 'santa_isabel' })],
      sinCobertura(),
      30,
      AHORA,
    );
    expect(calidad.tiendas.jumbo.ejecucionesConsideradas).toBe(0);
    expect(calidad.tiendas.santa_isabel.ejecucionesConsideradas).toBe(1);
  });

  it('solo considera las ejecuciones más recientes', () => {
    const muchas = Array.from({ length: VENTANA_EJECUCIONES + 5 }, (_, i) =>
      ejecucion({ iniciadaEn: new Date(Date.UTC(2026, 10, 1, i)) }),
    );
    const calidad = calcularCalidad(muchas, sinCobertura(), 30, AHORA);
    expect(calidad.tiendas.jumbo.ejecucionesConsideradas).toBe(VENTANA_EJECUCIONES);
  });

  it('calcula la cobertura del catálogo por tienda y en ambas', () => {
    const cobertura = {
      jumbo: new Set(['arroz', 'pollo', 'pan']),
      santa_isabel: new Set(['arroz', 'pan']),
    };
    const calidad = calcularCalidad([], cobertura, 4, AHORA);
    expect(calidad.tiendas.jumbo.cobertura).toEqual({ terminosConPrecio: 3, terminosTotal: 4, porcentaje: 75 });
    expect(calidad.tiendas.santa_isabel.cobertura.porcentaje).toBe(50);
    expect(calidad.coberturaAmbasTiendas).toEqual({ terminosConPrecio: 2, terminosTotal: 4, porcentaje: 50 });
  });

  it('sin datos devuelve ceros y nulos en vez de fallar', () => {
    const calidad = calcularCalidad([], sinCobertura(), 30, AHORA);
    expect(calidad.tiendas.jumbo.porcentajeValidos).toBe(0);
    expect(calidad.tiendas.jumbo.ultimaActualizacion).toBeNull();
    expect(calidad.tiendas.jumbo.duracionPromedioMs).toBeNull();
    expect(calidad.coberturaAmbasTiendas.porcentaje).toBe(0);
  });
});
