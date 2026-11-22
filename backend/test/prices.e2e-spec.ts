import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { PricesService } from './../src/prices/prices.service';
import { PythonClientService } from './../src/python-client/python-client.service';
import { ScrapedProduct, ScrapeSearchRequest } from './../src/python-client/scrape.types';
import { configureApp } from './../src/setup-app';

const DOMINIO = { jumbo: 'www.jumbo.cl', santa_isabel: 'www.santaisabel.cl' };

function producto(
  tienda: ScrapeSearchRequest['tienda'],
  consulta: string,
  slug: string,
  precio: number,
): ScrapedProduct {
  return {
    consulta,
    external_id: slug,
    nombre: `Producto ${slug}`,
    nombre_normalizado: `producto ${slug}`,
    marca: 'Marca E2E',
    precio,
    moneda: 'CLP',
    cantidad: 1,
    unidad: 'kg',
    precio_unitario: precio,
    disponible: true,
    url: `https://${DOMINIO[tienda]}/${slug}/p`,
    imagen: null,
  };
}

/** Simula al servicio Python: un producto propio por consulta y uno idéntico en ambas tiendas. */
function respuestaDePython(peticion: ScrapeSearchRequest) {
  const resultados = peticion.consultas.map((consulta) =>
    producto(peticion.tienda, consulta, `e2e-${consulta.replace(/ /g, '-')}-${peticion.tienda}`, 1000),
  );
  if (peticion.consultas.includes('arroz')) {
    const precio = peticion.tienda === 'jumbo' ? 2000 : 1500;
    resultados.push(producto(peticion.tienda, 'arroz', 'e2e-arroz-comun', precio));
  }
  return Promise.resolve({
    invalidos: 0,
    response: {
      tienda: peticion.tienda,
      estado: 'ok' as const,
      obtenido_en: new Date().toISOString(),
      resultados,
      errores: [],
      estadisticas: {
        consultas_total: peticion.consultas.length,
        consultas_ok: peticion.consultas.length,
        consultas_fallidas: 0,
        registros_extraidos: resultados.length,
        registros_validos: resultados.length,
        registros_duplicados: 0,
        registros_descartados: 0,
        descartes_por_motivo: {},
        duracion_ms: 10,
      },
    },
  });
}

describe('Precios (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let precios: PricesService;
  let token: string;
  const email = `e2e-precios-${Date.now()}@test.cl`;
  const corridasCreadas: string[] = [];
  const python = { normalizeIngredients: jest.fn(), scrapeSearch: jest.fn() };

  const get = (ruta: string) =>
    request(app.getHttpServer()).get(ruta).set('Authorization', `Bearer ${token}`);
  const refrescar = (cuerpo: object = {}) =>
    request(app.getHttpServer())
      .post('/api/prices/refresh')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo);

  async function actualizarYEsperar(tiendas: string[]) {
    const respuesta = await refrescar({ tiendas }).expect(202);
    const ids = (respuesta.body as { id: string }[]).map((corrida) => corrida.id);
    corridasCreadas.push(...ids);
    await precios.esperarActualizacion();
    return ids;
  }

  const contarPrecios = async (slug: string): Promise<number> => {
    const filas = await dataSource.query<{ total: string }[]>(
      `SELECT count(*) AS total FROM "precios_supermercado" p
       JOIN "productos" pr ON pr."id" = p."productoId" WHERE pr."slug" = $1`,
      [slug],
    );
    return Number(filas[0].total);
  };

  beforeAll(async () => {
    process.env.PRICES_MIN_REFRESH_INTERVAL_MINUTES = '0';
    python.scrapeSearch.mockImplementation(respuestaDePython);

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PythonClientService)
      .useValue(python)
      .compile();
    app = modulo.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
    precios = app.get(PricesService);

    const registro = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'secreto123', name: 'E2E Precios' })
      .expect(201);
    token = (registro.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    delete process.env.PRICES_MIN_REFRESH_INTERVAL_MINUTES;
    await dataSource.query(`DELETE FROM "productos" WHERE "slug" LIKE 'e2e-%'`);
    if (corridasCreadas.length > 0) {
      await dataSource.query(`DELETE FROM "ejecuciones_scraping" WHERE "id" = ANY($1::uuid[])`, [
        corridasCreadas,
      ]);
    }
    await dataSource.query(`DELETE FROM "users" WHERE "email" = $1`, [email]);
    await app.close();
  });

  it('exige autenticación en todas las rutas', async () => {
    await request(app.getHttpServer()).get('/api/prices/catalog').expect(401);
    await request(app.getHttpServer()).post('/api/prices/refresh').send({}).expect(401);
    await request(app.getHttpServer()).get('/api/prices/compare').expect(401);
  });

  it('devuelve el id de solicitud y expone las métricas de tiempo de respuesta', async () => {
    const conId = await request(app.getHttpServer())
      .get('/api/prices/catalog')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-ID', 'e2e-traza-1')
      .expect(200);
    expect(conId.headers['x-request-id']).toBe('e2e-traza-1');

    const sinId = await get('/api/prices/catalog').expect(200);
    expect(sinId.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    await request(app.getHttpServer()).get('/api/metrics').expect(401);
    const metricas = await get('/api/metrics').expect(200);
    const cuerpo = metricas.body as { rutas: { ruta: string; solicitudes: number; p95Ms: number }[] };
    const ruta = cuerpo.rutas.find((r) => r.ruta === 'GET /api/prices/catalog');
    expect(ruta?.solicitudes).toBeGreaterThanOrEqual(2);
    expect(ruta?.p95Ms).toBeGreaterThanOrEqual(0);
  });

  it('entrega el catálogo de términos', async () => {
    const respuesta = await get('/api/prices/catalog').expect(200);
    const terminos = (respuesta.body as { termino: string }[]).map((t) => t.termino);
    expect(terminos).toHaveLength(31);
    expect(terminos).toContain('arroz');
  });

  it('valida los parámetros de entrada', async () => {
    await refrescar({ tiendas: ['lider'] }).expect(400);
    await get('/api/prices/compare?terminos=caviar').expect(400);
    await get('/api/prices/runs/no-es-un-uuid').expect(400);
    await get('/api/prices/runs?limite=0').expect(400);
  });

  it('actualiza los precios en segundo plano y los deja disponibles para comparar', async () => {
    const respuesta = await refrescar({ tiendas: ['jumbo', 'santa_isabel'] }).expect(202);
    const corridas = respuesta.body as { id: string; estado: string; tienda: string }[];
    corridasCreadas.push(...corridas.map((c) => c.id));
    expect(corridas).toHaveLength(2);
    expect(corridas.every((c) => c.estado === 'en_curso')).toBe(true);

    await precios.esperarActualizacion();

    for (const corrida of corridas) {
      const estado = await get(`/api/prices/runs/${corrida.id}`).expect(200);
      expect(estado.body).toMatchObject({ estado: 'ok', consultasTotal: 31, consultasFallidas: 0 });
      expect((estado.body as { registrosValidos: number }).registrosValidos).toBeGreaterThan(30);
    }

    const comparacion = await get('/api/prices/compare?terminos=arroz,pollo').expect(200);
    const cuerpo = comparacion.body as {
      terminos: { termino: string; tiendas: Record<string, unknown> }[];
      comunes: { slug: string; masBarata: string; diferencia: number }[];
      ultimaActualizacion: Record<string, string | null>;
    };
    expect(cuerpo.terminos.map((t) => t.termino)).toEqual(['arroz', 'pollo']);
    expect(cuerpo.terminos[0].tiendas.jumbo).not.toBeNull();
    expect(cuerpo.terminos[0].tiendas.santa_isabel).not.toBeNull();
    expect(cuerpo.ultimaActualizacion.jumbo).not.toBeNull();
    const comun = cuerpo.comunes.find((c) => c.slug === 'e2e-arroz-comun');
    expect(comun).toMatchObject({ masBarata: 'santa_isabel', diferencia: 500 });
  });

  it('es idempotente: actualizar otra vez el mismo día no duplica los precios', async () => {
    expect(await contarPrecios('e2e-arroz-comun')).toBe(2);
    await actualizarYEsperar(['jumbo', 'santa_isabel']);
    expect(await contarPrecios('e2e-arroz-comun')).toBe(2);
  });

  it('lista las ejecuciones recientes', async () => {
    const respuesta = await get('/api/prices/runs?limite=50').expect(200);
    const ids = (respuesta.body as { id: string }[]).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(corridasCreadas.slice(0, 2)));
  });

  it('entrega las métricas de calidad de los datos', async () => {
    const respuesta = await get('/api/prices/quality').expect(200);
    const calidad = respuesta.body as {
      tiendas: Record<string, { porcentajeValidos: number; cobertura: { terminosTotal: number } }>;
      coberturaAmbasTiendas: { porcentaje: number };
    };
    expect(calidad.tiendas.jumbo.cobertura.terminosTotal).toBe(31);
    expect(calidad.tiendas.jumbo.porcentajeValidos).toBeGreaterThan(0);
    expect(calidad.coberturaAmbasTiendas.porcentaje).toBeGreaterThan(0);
  });

  it('responde 409 si ya hay una actualización en curso', async () => {
    const [{ id }] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "ejecuciones_scraping" ("tienda", "estado", "iniciadaEn")
       VALUES ('jumbo', 'en_curso', now()) RETURNING "id"`,
    );
    corridasCreadas.push(id);
    try {
      await refrescar({ tiendas: ['jumbo'] }).expect(409);
    } finally {
      await dataSource.query(`UPDATE "ejecuciones_scraping" SET "estado" = 'fallido' WHERE "id" = $1`, [id]);
    }
  });

  it('responde 429 si hubo una actualización exitosa hace poco', async () => {
    process.env.PRICES_MIN_REFRESH_INTERVAL_MINUTES = '10';
    try {
      const respuesta = await refrescar({ tiendas: ['jumbo'] }).expect(429);
      expect((respuesta.body as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThan(0);
    } finally {
      process.env.PRICES_MIN_REFRESH_INTERVAL_MINUTES = '0';
    }
  });

  it('si el servicio Python no responde, la corrida falla pero los datos anteriores siguen disponibles', async () => {
    python.scrapeSearch.mockRejectedValue(new ServiceUnavailableException('caído'));
    try {
      const [id] = await actualizarYEsperar(['jumbo']);
      const estado = await get(`/api/prices/runs/${id}`).expect(200);
      expect(estado.body).toMatchObject({ estado: 'fallido', registrosValidos: 0 });
      expect((estado.body as { errores: unknown[] }).errores.length).toBeGreaterThan(0);
    } finally {
      python.scrapeSearch.mockImplementation(respuestaDePython);
    }

    const comparacion = await get('/api/prices/compare?terminos=arroz').expect(200);
    const comunes = (comparacion.body as { comunes: { slug: string }[] }).comunes;
    expect(comunes.map((c) => c.slug)).toContain('e2e-arroz-comun');
  });
});
