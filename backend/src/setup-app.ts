import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MetricsService } from './observability/metrics.service';
import { crearMiddlewareObservabilidad } from './observability/observability.middleware';

/**
 * Configuracion compartida entre el bootstrap real (main.ts) y los tests e2e,
 * para que ambos validen exactamente el mismo comportamiento y no se
 * desincronicen con el tiempo (ej. el prefijo global o la lista de exclude).
 */
export function configureApp(app: INestApplication): void {
  // Primero: asigna el id de solicitud antes de que cualquier otra cosa escriba logs.
  app.use(crearMiddlewareObservabilidad(app.get(MetricsService)));
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
