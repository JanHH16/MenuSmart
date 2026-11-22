import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';
import { crearMiddlewareObservabilidad, idDeSolicitud } from './observability.middleware';
import { obtenerRequestId } from './request-context';

function simular(cabeceras: Record<string, string> = {}, status = 200) {
  const metricas = new MetricsService();
  const middleware = crearMiddlewareObservabilidad(metricas);
  const req = {
    method: 'GET',
    headers: cabeceras,
    originalUrl: '/api/prices/runs/abc?secreto=1',
    route: { path: '/api/prices/runs/:id' },
  } as unknown as Request;
  const cabecerasRespuesta: Record<string, string> = {};
  const res = Object.assign(new EventEmitter(), {
    statusCode: status,
    setHeader: (nombre: string, valor: string) => {
      cabecerasRespuesta[nombre] = valor;
    },
  }) as unknown as Response;

  let idDentro: string | undefined;
  middleware(req, res, () => {
    idDentro = obtenerRequestId();
  });
  res.emit('finish');
  return { metricas, cabecerasRespuesta, idDentro };
}

describe('idDeSolicitud', () => {
  it('reutiliza un id seguro', () => {
    expect(idDeSolicitud('abc-123_X.9')).toBe('abc-123_X.9');
  });

  it.each([undefined, '', 'con espacios', 'a'.repeat(65), 'id\nfalso', '<script>', ['a', 'b']])(
    'genera uno nuevo si el valor no es seguro (%p)',
    (valor) => {
      expect(idDeSolicitud(valor)).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});

describe('middleware de observabilidad', () => {
  it('devuelve el id recibido en X-Request-ID y lo deja disponible durante la solicitud', () => {
    const { cabecerasRespuesta, idDentro } = simular({ 'x-request-id': 'pedido-42' });
    expect(cabecerasRespuesta['X-Request-ID']).toBe('pedido-42');
    expect(idDentro).toBe('pedido-42');
  });

  it('genera un id si no llega ninguno', () => {
    const { cabecerasRespuesta, idDentro } = simular();
    expect(cabecerasRespuesta['X-Request-ID']).toMatch(/^[0-9a-f-]{36}$/);
    expect(idDentro).toBe(cabecerasRespuesta['X-Request-ID']);
  });

  it('registra el tiempo de respuesta con la plantilla de la ruta', () => {
    const { metricas } = simular({}, 500);
    const [ruta] = metricas.snapshot().rutas;
    expect(ruta).toMatchObject({
      ruta: 'GET /api/prices/runs/:id',
      solicitudes: 1,
      errores5xx: 1,
    });
  });

  it('no deja el id pegado fuera de la solicitud', () => {
    simular({ 'x-request-id': 'temporal' });
    expect(obtenerRequestId()).toBeUndefined();
  });
});
