import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';
import { conContextoDeSolicitud } from './request-context';

export const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_VALIDO = /^[A-Za-z0-9._-]{1,64}$/;
const RUTAS_SILENCIOSAS = new Set(['/health', '/api/metrics']);

/** Reutiliza el id que manda el llamador si es seguro; si no, genera uno. */
export function idDeSolicitud(recibido: unknown): string {
  return typeof recibido === 'string' && REQUEST_ID_VALIDO.test(recibido)
    ? recibido
    : randomUUID();
}

/**
 * Asigna un id a cada solicitud (lo devuelve en X-Request-ID), lo deja disponible para todo
 * el codigo que ella dispare, y al terminar registra un log y la metrica de tiempo de respuesta.
 */
export function crearMiddlewareObservabilidad(metrics: MetricsService) {
  const logger = new Logger('HTTP');

  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = idDeSolicitud(req.headers[REQUEST_ID_HEADER]);
    res.setHeader('X-Request-ID', requestId);
    const inicio = process.hrtime.bigint();

    res.on('finish', () => {
      const milisegundos = Number(process.hrtime.bigint() - inicio) / 1e6;
      // Plantilla de la ruta (/api/prices/runs/:id) y no la URL real: evita una clave por id.
      const ruta = (req.route as { path?: string } | undefined)?.path ?? '(sin ruta)';
      metrics.registrarSolicitud(req.method, ruta, res.statusCode, milisegundos);

      const datos = {
        msg: 'http_request',
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(milisegundos * 100) / 100,
      };
      if (RUTAS_SILENCIOSAS.has(datos.path)) logger.debug(datos);
      else logger.log(datos);
    });

    conContextoDeSolicitud(requestId, next);
  };
}
