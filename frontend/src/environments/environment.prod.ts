// En producción, el frontend y el backend se sirven bajo el mismo origen:
// un proxy inverso (nginx, configurado en la Fase 2 de contenerización) enruta
// las peticiones a /api/* hacia el contenedor de NestJS (que expone ese mismo
// prefijo mediante app.setGlobalPrefix('api') en backend/src/main.ts).
export const environment = {
  production: true,
  apiUrl: '/api',
};
