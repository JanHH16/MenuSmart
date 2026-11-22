import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/setup-app';
import { configurarSwagger } from './../src/setup-swagger';

describe('Seguridad HTTP (e2e)', () => {
  let app: INestApplication<App>;
  const variablesOriginales = { ...process.env };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configureApp(app);
    configurarSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    process.env = variablesOriginales;
    await app.close();
  });

  describe('cabeceras de seguridad', () => {
    it('una respuesta normal de la API lleva las cabeceras de helmet', async () => {
      const respuesta = await request(app.getHttpServer()).get('/api').expect(200);
      const h = respuesta.headers;
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['x-frame-options']).toBe('SAMEORIGIN');
      expect(h['strict-transport-security']).toContain('max-age=');
      expect(h['referrer-policy']).toBe('no-referrer');
      expect(h['cross-origin-opener-policy']).toBe('same-origin');
      expect(h['content-security-policy']).toContain("default-src 'none'");
      expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    it('no revela el framework en la cabecera X-Powered-By', async () => {
      const respuesta = await request(app.getHttpServer()).get('/api').expect(200);
      expect(respuesta.headers['x-powered-by']).toBeUndefined();
    });

    it('las respuestas de error y las de 401 también llevan las cabeceras', async () => {
      const respuesta = await request(app.getHttpServer()).get('/api/prices/catalog').expect(401);
      expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    });

    it('mantiene CORS: responde al preflight y devuelve Access-Control-Allow-Origin', async () => {
      const preflight = await request(app.getHttpServer())
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:4200')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);
      expect(preflight.headers['access-control-allow-origin']).toBe('*');

      const normal = await request(app.getHttpServer())
        .get('/api')
        .set('Origin', 'http://localhost:4200')
        .expect(200);
      expect(normal.headers['access-control-allow-origin']).toBe('*');
    });

    it('Swagger UI sigue disponible con una política que permite sus recursos', async () => {
      const pagina = await request(app.getHttpServer()).get('/api/docs').expect(200);
      expect(pagina.text).toContain('swagger-ui');
      const csp = pagina.headers['content-security-policy'];
      expect(csp).toContain("script-src 'self';");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).not.toContain('upgrade-insecure-requests');
      expect(csp).not.toContain("default-src 'none'");

      const json = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
      expect((json.body as { info: { title: string } }).info.title).toBe('MenuSmart API');
    });
  });

  describe('limite de solicitudes', () => {
    const login = () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'no-existe-e2e@test.cl', password: 'cualquiera1' });

    it('login responde 429 al superar el límite configurado', async () => {
      process.env.RATE_LIMIT_LOGIN_MAX = '3';
      try {
        for (let i = 0; i < 3; i++) await login().expect(401);
        const bloqueada = await login().expect(429);
        expect(bloqueada.headers['retry-after']).toBeDefined();
        expect(bloqueada.headers['x-content-type-options']).toBe('nosniff');
      } finally {
        process.env.RATE_LIMIT_LOGIN_MAX = variablesOriginales.RATE_LIMIT_LOGIN_MAX;
      }
    });

    it('el límite de login no bloquea otras rutas', async () => {
      await request(app.getHttpServer()).get('/api').expect(200);
    });

    it('register y refresh también tienen un límite propio configurable', async () => {
      process.env.RATE_LIMIT_REGISTER_MAX = '1';
      process.env.RATE_LIMIT_REFRESH_MAX = '1';
      try {
        // Cuerpo inválido: llega a validación (400) mientras no se supere el límite.
        const registrar = () => request(app.getHttpServer()).post('/api/auth/register').send({});
        await registrar().expect(400);
        await registrar().expect(429);

        // Sin token: el guard de límite corre antes que el de autenticación.
        const refrescar = () => request(app.getHttpServer()).post('/api/prices/refresh').send({});
        await refrescar().expect(401);
        await refrescar().expect(429);
      } finally {
        process.env.RATE_LIMIT_REGISTER_MAX = variablesOriginales.RATE_LIMIT_REGISTER_MAX;
        process.env.RATE_LIMIT_REFRESH_MAX = variablesOriginales.RATE_LIMIT_REFRESH_MAX;
      }
    });

    it('un valor inválido en la variable cae al valor por defecto, no a "sin límite"', async () => {
      process.env.RATE_LIMIT_LOGIN_MAX = 'abc';
      try {
        // Por defecto son 10 por minuto, y el test anterior ya consumió la ventana de login.
        await login().expect(429);
      } finally {
        process.env.RATE_LIMIT_LOGIN_MAX = variablesOriginales.RATE_LIMIT_LOGIN_MAX;
      }
    });
  });
});
