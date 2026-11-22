import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { StructuredLogger } from './../src/observability/structured-logger';
import { configureApp } from './../src/setup-app';

const CLAVE = 'clave-e2e-9876';

describe('Cuenta de usuario y autenticación (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  let userId: string;
  let comidaId: string;
  const correo = `e2e-usuarios-${Date.now()}@test.cl`;
  const correoMayusculas = correo.toUpperCase().replace('@TEST.CL', '@Test.CL');
  const lineasDeLog: string[] = [];
  const http = () => request(app.getHttpServer());
  const conToken = (t = token) => ({ Authorization: `Bearer ${t}` });

  const existe = async (tabla: 'users' | 'comidas' | 'listas_compra', columna: string, valor: string) => {
    const filas = await dataSource.query<{ total: string }[]>(
      `SELECT count(*) AS total FROM "${tabla}" WHERE "${columna}" = $1`,
      [valor],
    );
    return Number(filas[0].total) > 0;
  };

  beforeAll(async () => {
    // Todo lo que el backend escriba en el log durante esta suite se guarda para inspeccionarlo.
    jest.spyOn(process.stdout, 'write').mockImplementation((texto) => {
      lineasDeLog.push(String(texto));
      return true;
    });
    jest.spyOn(process.stderr, 'write').mockImplementation((texto) => {
      lineasDeLog.push(String(texto));
      return true;
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.useLogger(new StructuredLogger('debug'));
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM "users" WHERE LOWER("email") = LOWER($1)`, [correo]);
    await app.close();
    jest.restoreAllMocks();
    Logger.overrideLogger(['log', 'error', 'warn']);
  });

  describe('registro e inicio de sesión', () => {
    it('rechaza contraseñas que no cumplen la política mínima', async () => {
      for (const password of ['corta1', 'sololetrassinnumero', '123456789012']) {
        await http()
          .post('/api/auth/register')
          .send({ email: correo, password, name: 'E2E Usuario' })
          .expect(400);
      }
    });

    it('registra normalizando el email y permite entrar con otra capitalización', async () => {
      const registro = await http()
        .post('/api/auth/register')
        .send({ email: `  ${correoMayusculas} `, password: CLAVE, name: 'E2E Usuario' })
        .expect(201);
      token = (registro.body as { accessToken: string }).accessToken;

      const guardado = await dataSource.query<{ id: string; email: string }[]>(
        `SELECT "id", "email" FROM "users" WHERE LOWER("email") = $1`,
        [correo.toLowerCase()],
      );
      expect(guardado).toHaveLength(1);
      expect(guardado[0].email).toBe(correo.toLowerCase());
      userId = guardado[0].id;

      const login = await http()
        .post('/api/auth/login')
        .send({ email: correoMayusculas, password: CLAVE })
        .expect(200);
      expect((login.body as { accessToken: string }).accessToken).toEqual(expect.any(String));
    });

    it('no permite registrar el mismo correo con otra capitalización', async () => {
      await http()
        .post('/api/auth/register')
        .send({ email: correo, password: CLAVE, name: 'Otra Vez' })
        .expect(409);
    });

    it('el login falla igual con un correo inexistente que con una contraseña incorrecta', async () => {
      const sinUsuario = await http()
        .post('/api/auth/login')
        .send({ email: 'nadie-e2e@test.cl', password: 'cualquiera123' })
        .expect(401);
      const malaClave = await http()
        .post('/api/auth/login')
        .send({ email: correo, password: 'incorrecta123' })
        .expect(401);
      expect(sinUsuario.body).toEqual(malaClave.body);
    });

    it('el JWT usa HS256 y expira en una hora (JWT_EXPIRES_IN)', () => {
      const [cabecera, carga] = token.split('.').slice(0, 2).map(
        (parte) => JSON.parse(Buffer.from(parte, 'base64url').toString()) as Record<string, number | string>,
      );
      expect(cabecera.alg).toBe('HS256');
      expect(Number(carga.exp) - Number(carga.iat)).toBe(3600);
    });

    it('rechaza un token firmado con otro algoritmo (alg none)', async () => {
      const codificar = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
      const sinFirma = `${codificar({ alg: 'none', typ: 'JWT' })}.${codificar({ sub: userId })}.`;
      await http().get('/api/users/me').set(conToken(sinFirma)).expect(401);
    });
  });

  describe('GET /api/users/me', () => {
    it('exige autenticación', async () => {
      await http().get('/api/users/me').expect(401);
    });

    it('devuelve el perfil sin el hash de la contraseña', async () => {
      const respuesta = await http().get('/api/users/me').set(conToken()).expect(200);
      expect(respuesta.body).toEqual({
        id: userId,
        email: correo.toLowerCase(),
        name: 'E2E Usuario',
        createdAt: expect.any(String),
      });
      expect(JSON.stringify(respuesta.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    });
  });

  describe('DELETE /api/users/me', () => {
    beforeAll(async () => {
      // Datos del usuario que deben desaparecer en cascada.
      const [comida] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO "comidas" ("usuarioId", "nombre", "diaSemana") VALUES ($1, 'Comida E2E', 'lunes') RETURNING "id"`,
        [userId],
      );
      comidaId = comida.id;
      await dataSource.query(
        `INSERT INTO "ingredientes" ("comidaId", "nombre", "cantidad", "unidad") VALUES ($1, 'arroz', 1, 'kg')`,
        [comidaId],
      );
      await dataSource.query(
        `INSERT INTO "listas_compra" ("usuarioId", "semana") VALUES ($1, '2026-11-23')`,
        [userId],
      );
    });

    it('exige autenticación y la contraseña en el cuerpo', async () => {
      await http().delete('/api/users/me').send({ password: CLAVE }).expect(401);
      await http().delete('/api/users/me').set(conToken()).send({}).expect(400);
      await http().delete('/api/users/me').set(conToken()).expect(400);
    });

    it('con la contraseña incorrecta responde 403 y no borra nada', async () => {
      await http()
        .delete('/api/users/me')
        .set(conToken())
        .send({ password: 'incorrecta123' })
        .expect(403);
      expect(await existe('users', 'id', userId)).toBe(true);
      expect(await existe('comidas', 'usuarioId', userId)).toBe(true);
      await http().get('/api/users/me').set(conToken()).expect(200);
    });

    it('con la contraseña correcta responde 204 y borra al usuario con todos sus datos', async () => {
      const respuesta = await http()
        .delete('/api/users/me')
        .set(conToken())
        .send({ password: CLAVE })
        .expect(204);
      expect(respuesta.text).toBe('');

      expect(await existe('users', 'id', userId)).toBe(false);
      expect(await existe('comidas', 'usuarioId', userId)).toBe(false);
      expect(await existe('listas_compra', 'usuarioId', userId)).toBe(false);
      const ingredientes = await dataSource.query<{ total: string }[]>(
        `SELECT count(*) AS total FROM "ingredientes" WHERE "comidaId" = $1`,
        [comidaId],
      );
      expect(Number(ingredientes[0].total)).toBe(0);
    });

    it('el token deja de servir y no se puede volver a entrar', async () => {
      await http().get('/api/users/me').set(conToken()).expect(401);
      await http().get('/api/prices/catalog').set(conToken()).expect(401);
      await http().post('/api/auth/login').send({ email: correo, password: CLAVE }).expect(401);
    });
  });

  describe('registros sin secretos', () => {
    it('tras registrar, entrar, consultar y borrar, ni la contraseña ni los tokens aparecen en el log', () => {
      const log = lineasDeLog.join('');
      expect(log).toContain('http_request');
      expect(log).not.toContain(CLAVE);
      expect(log).not.toContain('incorrecta123');
      expect(log).not.toContain(token);
      expect(log).not.toMatch(/eyJ[\w-]+\.[\w-]+\./);
      expect(log).not.toMatch(/\$2[aby]\$\d\d\$/);
      // El correo tampoco debe quedar en el log.
      expect(log.toLowerCase()).not.toContain(correo.toLowerCase());
    });
  });
});
