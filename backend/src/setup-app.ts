import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { MetricsService } from './observability/metrics.service';
import { crearMiddlewareObservabilidad } from './observability/observability.middleware';
import { RUTA_DOCS } from './setup-swagger';

/**
 * Cabeceras de seguridad (helmet). La API solo responde JSON, asi que su politica de
 * contenido es la mas estricta posible. Swagger UI necesita cargar sus propios recursos,
 * por eso /api/docs usa una politica propia y ninguna otra ruta la hereda.
 */
function crearMiddlewareCabeceras() {
  const api = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  });
  const docs = helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Swagger UI solo necesita scripts del mismo origen y estilos en línea.
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        // Sin esto el navegador intenta cargar los recursos por https y falla sobre http.
        'upgrade-insecure-requests': null,
      },
    },
  });
  return (req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith(`/${RUTA_DOCS}`) ? docs : api)(req, res, next);
}

/**
 * Configuracion compartida entre el bootstrap real (main.ts) y los tests e2e,
 * para que ambos validen exactamente el mismo comportamiento y no se
 * desincronicen con el tiempo (ej. el prefijo global o la lista de exclude).
 */
export function configureApp(app: INestApplication): void {
  // Detras de un proxy (Render, balanceadores) req.ip seria la IP del proxy y el limite de
  // solicitudes agruparia a todos los usuarios. TRUST_PROXY = numero de proxies de confianza.
  const proxy = process.env.TRUST_PROXY;
  if (proxy) {
    (app.getHttpAdapter().getInstance() as Application).set(
      'trust proxy',
      /^\d+$/.test(proxy) ? Number(proxy) : proxy,
    );
  }
  // Primero: asigna el id de solicitud antes de que cualquier otra cosa escriba logs.
  app.use(crearMiddlewareObservabilidad(app.get(MetricsService)));
  app.use(crearMiddlewareCabeceras());
  app.enableCors();
  // "health" queda fuera del prefijo para que orquestadores (Docker, balanceadores)
  // puedan consultarlo en /health sin conocer el prefijo de la API.
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
