import { MetricsService, percentil } from './metrics.service';

describe('percentil', () => {
  it('calcula p50 y p95 sobre muestras ordenadas o no', () => {
    const muestras = Array.from({ length: 100 }, (_, i) => 100 - i);
    expect(percentil(muestras, 50)).toBe(50);
    expect(percentil(muestras, 95)).toBe(95);
  });

  it('devuelve 0 sin muestras', () => {
    expect(percentil([], 95)).toBe(0);
  });
});

describe('MetricsService', () => {
  let metricas: MetricsService;

  beforeEach(() => {
    metricas = new MetricsService();
  });

  it('agrupa por método y plantilla de ruta, y cuenta los errores 5xx', () => {
    metricas.registrarSolicitud('GET', '/api/prices/runs/:id', 200, 10);
    metricas.registrarSolicitud('GET', '/api/prices/runs/:id', 500, 30);
    metricas.registrarSolicitud('POST', '/api/prices/refresh', 202, 5);

    const { rutas, solicitudesTotal } = metricas.snapshot();
    expect(solicitudesTotal).toBe(3);
    expect(rutas.map((r) => r.ruta)).toEqual([
      'GET /api/prices/runs/:id',
      'POST /api/prices/refresh',
    ]);
    expect(rutas[0]).toMatchObject({ solicitudes: 2, errores5xx: 1, promedioMs: 20 });
  });

  it('conserva solo las últimas 500 muestras por ruta pero cuenta todas las solicitudes', () => {
    for (let i = 1; i <= 600; i++) metricas.registrarSolicitud('GET', '/x', 200, i);
    const [ruta] = metricas.snapshot().rutas;
    expect(ruta.solicitudes).toBe(600);
    expect(ruta.p50Ms).toBeGreaterThan(300);
  });

  it('acumula por tienda el resultado de las actualizaciones y sus errores', () => {
    metricas.registrarActualizacion('jumbo', 'ok', 1000, {});
    metricas.registrarActualizacion('jumbo', 'fallido', 3000, { timeout: 2, red: 1 });
    metricas.registrarActualizacion('jumbo', 'parcial', 2000, { timeout: 1 });

    expect(metricas.snapshot().fuenteExterna.jumbo).toEqual({
      corridas: 3,
      porEstado: { ok: 1, fallido: 1, parcial: 1 },
      erroresPorTipo: { timeout: 3, red: 1 },
      duracionPromedioMs: 2000,
    });
  });
});
