import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { PythonClientService } from './../src/python-client/python-client.service';
import { configureApp } from './../src/setup-app';

const SEMANA = '2026-11-25'; // miercoles; su lunes es 2026-11-23
const PREFIJO = 'dom-e2e-';

interface Usuario {
  email: string;
  token: string;
}

describe('Plan semanal y lista de compras (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let ana: Usuario;
  let beto: Usuario;
  const python = { normalizeIngredients: jest.fn(), scrapeSearch: jest.fn() };
  const sufijo = Date.now();

  const con = (usuario: Usuario) => ({
    get: (ruta: string) =>
      request(app.getHttpServer()).get(ruta).set('Authorization', `Bearer ${usuario.token}`),
    post: (ruta: string, cuerpo: object = {}) =>
      request(app.getHttpServer())
        .post(ruta)
        .set('Authorization', `Bearer ${usuario.token}`)
        .send(cuerpo),
    patch: (ruta: string, cuerpo: object = {}) =>
      request(app.getHttpServer())
        .patch(ruta)
        .set('Authorization', `Bearer ${usuario.token}`)
        .send(cuerpo),
    delete: (ruta: string) =>
      request(app.getHttpServer()).delete(ruta).set('Authorization', `Bearer ${usuario.token}`),
  });

  async function registrar(nombre: string): Promise<Usuario> {
    const email = `e2e-dominio-${nombre}-${sufijo}@test.cl`;
    const respuesta = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'secreto123', name: `E2E ${nombre}` })
      .expect(201);
    return { email, token: (respuesta.body as { accessToken: string }).accessToken };
  }

  const comida = (extra: object = {}) => ({
    nombre: 'Arroz con pollo',
    tipo: 'almuerzo',
    diaSemana: 'miercoles',
    semana: SEMANA,
    porciones: 2,
    ingredientes: [
      { nombre: 'Arroz', cantidad: 500, unidad: 'g' },
      { nombre: 'Pechuga de pollo', cantidad: 0.8, unidad: 'kg' },
    ],
    ...extra,
  });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PythonClientService)
      .useValue(python)
      .compile();
    app = modulo.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
    ana = await registrar('ana');
    beto = await registrar('beto');

    // Precios de "sal" siempre mas baratos que cualquier dato real: 1 y 2 pesos por kg.
    const [{ id: jumbo }] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "productos" ("slug", "nombreNormalizado", "nombre", "categoria", "cantidad", "unidad")
       VALUES ($1, $1, 'Sal de prueba Jumbo', 'despensa', 1, 'kg') RETURNING "id"`,
      [`${PREFIJO}sal-jumbo-${sufijo}`],
    );
    const [{ id: santaIsabel }] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO "productos" ("slug", "nombreNormalizado", "nombre", "categoria", "cantidad", "unidad")
       VALUES ($1, $1, 'Sal de prueba Santa Isabel', 'despensa', 1, 'kg') RETURNING "id"`,
      [`${PREFIJO}sal-si-${sufijo}`],
    );
    for (const [productoId, tienda, unitario] of [
      [jumbo, 'jumbo', 1],
      [santaIsabel, 'santa_isabel', 2],
    ] as const) {
      await dataSource.query(
        `INSERT INTO "precios_supermercado"
           ("productoId", "supermercado", "precio", "fechaObtencion", "fechaDia", "consulta",
            "precioUnitario", "disponible", "urlProducto")
         VALUES ($1, $2, $3::float8, now(), current_date, 'sal', $4::int, true, 'https://tienda.cl/sal')`,
        [productoId, tienda, unitario, unitario],
      );
    }
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM "productos" WHERE "slug" LIKE $1`, [`${PREFIJO}%`]);
    await dataSource.query(`DELETE FROM "users" WHERE "email" = ANY($1::text[])`, [
      [ana.email, beto.email],
    ]);
    await app.close();
  });

  it('exige autenticación en todas las rutas', async () => {
    const servidor = request(app.getHttpServer());
    await servidor.get('/api/meals').expect(401);
    await servidor.post('/api/meals').send({}).expect(401);
    await servidor.get('/api/shopping-lists').expect(401);
    await servidor.post('/api/shopping-lists/generate').send({}).expect(401);
  });

  describe('comidas', () => {
    it('valida los datos de entrada', async () => {
      await con(ana).post('/api/meals', comida({ tipo: 'brunch' })).expect(400);
      await con(ana).post('/api/meals', comida({ diaSemana: 'feriado' })).expect(400);
      await con(ana).post('/api/meals', comida({ semana: '2026-02-30' })).expect(400);
      await con(ana)
        .post('/api/meals', comida({ ingredientes: [{ nombre: 'Sal', cantidad: -1, unidad: 'g' }] }))
        .expect(400);
      await con(ana).post('/api/meals', comida({ nombre: '   ' })).expect(400);
      await con(ana).get('/api/meals?semana=ayer').expect(400);
      await con(ana).get('/api/meals/no-es-un-uuid').expect(400);
    });

    it('crea una comida con sus ingredientes en la semana que contiene la fecha', async () => {
      const respuesta = await con(ana).post('/api/meals', comida()).expect(201);
      const cuerpo = respuesta.body as {
        id: string;
        semana: string;
        porciones: number;
        ingredientes: { nombre: string }[];
      };
      expect(cuerpo.semana).toBe('2026-11-23');
      expect(cuerpo.porciones).toBe(2);
      expect(cuerpo.ingredientes.map((i) => i.nombre).sort()).toEqual(['Arroz', 'Pechuga de pollo']);
    });

    it('lista la semana ordenada de lunes a domingo y sin comidas de otras semanas', async () => {
      await con(ana)
        .post('/api/meals', comida({ nombre: 'Tortilla', diaSemana: 'lunes', ingredientes: [] }))
        .expect(201);
      await con(ana)
        .post('/api/meals', comida({ nombre: 'Otra semana', semana: '2026-12-10' }))
        .expect(201);

      const respuesta = await con(ana).get(`/api/meals?semana=${SEMANA}`).expect(200);
      const nombres = (respuesta.body as { nombre: string }[]).map((c) => c.nombre);
      expect(nombres).toEqual(['Tortilla', 'Arroz con pollo']);
    });

    it('aísla los datos entre usuarios: lo ajeno no existe', async () => {
      const [propia] = (await con(ana).get(`/api/meals?semana=${SEMANA}`).expect(200)).body as {
        id: string;
      }[];

      expect((await con(beto).get(`/api/meals?semana=${SEMANA}`).expect(200)).body).toEqual([]);
      await con(beto).get(`/api/meals/${propia.id}`).expect(404);
      await con(beto).patch(`/api/meals/${propia.id}`, { nombre: 'Robada' }).expect(404);
      await con(beto).delete(`/api/meals/${propia.id}`).expect(404);
      await con(ana).get(`/api/meals/${propia.id}`).expect(200);
    });

    it('modifica una comida y reemplaza sus ingredientes solo si se envían', async () => {
      const [{ id }] = (await con(ana).get(`/api/meals?semana=${SEMANA}`).expect(200)).body as {
        id: string;
      }[];

      const soloNombre = await con(ana).patch(`/api/meals/${id}`, { nombre: 'Tortilla de papas' });
      expect(soloNombre.status).toBe(200);
      expect(soloNombre.body).toMatchObject({ nombre: 'Tortilla de papas' });

      const conIngredientes = await con(ana)
        .patch(`/api/meals/${id}`, { ingredientes: [{ nombre: 'Papas', cantidad: 1, unidad: 'kg' }] })
        .expect(200);
      expect((conIngredientes.body as { ingredientes: unknown[] }).ingredientes).toHaveLength(1);
    });

    it('elimina una comida con sus ingredientes', async () => {
      const creada = await con(ana)
        .post('/api/meals', comida({ nombre: 'Para borrar', semana: '2027-01-06' }))
        .expect(201);
      const id = (creada.body as { id: string }).id;

      await con(ana).delete(`/api/meals/${id}`).expect(204);
      await con(ana).get(`/api/meals/${id}`).expect(404);
      const huerfanos = await dataSource.query<{ total: string }[]>(
        `SELECT count(*) AS total FROM "ingredientes" WHERE "comidaId" = $1`,
        [id],
      );
      expect(Number(huerfanos[0].total)).toBe(0);
    });
  });

  describe('lista de compras', () => {
    const normalizados = {
      items: [
        {
          name: 'sal',
          quantity: 3,
          unit: 'kg',
          term: 'sal',
          category: 'despensa',
          rules: ['nombre:exacto'],
          original_names: ['Sal'],
          merged_lines: 1,
        },
        {
          name: 'cilantro',
          quantity: 0.045,
          unit: 'l',
          term: null,
          category: null,
          rules: ['unidad:cucharada->l(x0.015)'],
          original_names: ['Cilantro'],
          merged_lines: 1,
        },
      ],
      original_count: 2,
      normalized_count: 2,
    };

    it('responde 404 mientras no se haya generado la lista de la semana', async () => {
      await con(beto).get(`/api/shopping-lists?semana=${SEMANA}`).expect(404);
    });

    it('responde 422 si la semana no tiene ingredientes planificados', async () => {
      await con(beto).post('/api/shopping-lists/generate', { semana: SEMANA }).expect(422);
      expect(python.normalizeIngredients).not.toHaveBeenCalled();
    });

    it('genera la lista normalizada y estima el costo solo con precios reales', async () => {
      python.normalizeIngredients.mockResolvedValue(normalizados);
      const respuesta = await con(ana).post('/api/shopping-lists/generate', { semana: SEMANA });
      expect(respuesta.status).toBe(200);

      // Python recibe todas las lineas de las comidas de la semana.
      const lineas = (python.normalizeIngredients.mock.calls[0] as [{ name: string }[]])[0];
      expect(lineas.map((l) => l.name).sort()).toEqual(['Arroz', 'Papas', 'Pechuga de pollo']);

      const cuerpo = respuesta.body as {
        semana: string;
        items: {
          nombre: string;
          terminoCatalogo: string | null;
          reglas: string[];
          costo: {
            tiendas: Record<string, { total: number } | null>;
            motivoSinPrecio: Record<string, string>;
          };
        }[];
        resumen: {
          itemsTotal: number;
          itemsComparables: number;
          itemsSinPrecio: number;
          comparable: { totales: Record<string, number>; masBarata: string; ahorro: number };
        };
      };
      expect(cuerpo.semana).toBe('2026-11-23');
      const sal = cuerpo.items.find((i) => i.nombre === 'sal');
      expect(sal?.costo.tiendas.jumbo?.total).toBe(3);
      expect(sal?.costo.tiendas.santa_isabel?.total).toBe(6);
      expect(sal?.reglas).toEqual(['nombre:exacto']);
      const cilantro = cuerpo.items.find((i) => i.nombre === 'cilantro');
      expect(cilantro?.costo.motivoSinPrecio).toEqual({
        jumbo: 'sin_termino',
        santa_isabel: 'sin_termino',
      });
      expect(cuerpo.resumen).toMatchObject({
        itemsTotal: 2,
        itemsComparables: 1,
        itemsSinPrecio: 1,
        comparable: { totales: { jumbo: 3, santa_isabel: 6 }, masBarata: 'jumbo', ahorro: 3 },
      });
    });

    it('marca items como comprados y lo conserva al regenerar la lista', async () => {
      const lista = (await con(ana).get(`/api/shopping-lists?semana=${SEMANA}`).expect(200)).body as {
        items: { id: string; nombre: string }[];
      };
      const sal = lista.items.find((i) => i.nombre === 'sal');
      expect(sal).toBeDefined();

      await con(beto).patch(`/api/shopping-lists/items/${sal?.id}`, { comprado: true }).expect(404);
      await con(ana).patch(`/api/shopping-lists/items/${sal?.id}`, { comprado: 'si' }).expect(400);
      await con(ana).patch(`/api/shopping-lists/items/${sal?.id}`, { comprado: true }).expect(204);

      await con(ana).post('/api/shopping-lists/generate', { semana: SEMANA }).expect(200);
      const regenerada = (await con(ana).get(`/api/shopping-lists?semana=${SEMANA}`).expect(200))
        .body as { items: { nombre: string; comprado: boolean }[] };
      expect(regenerada.items.find((i) => i.nombre === 'sal')?.comprado).toBe(true);
      expect(regenerada.items.find((i) => i.nombre === 'cilantro')?.comprado).toBe(false);
    });

    it('si el servicio Python no responde, falla sin perder la lista anterior', async () => {
      python.normalizeIngredients.mockRejectedValue(new ServiceUnavailableException('caído'));
      await con(ana).post('/api/shopping-lists/generate', { semana: SEMANA }).expect(503);

      const lista = await con(ana).get(`/api/shopping-lists?semana=${SEMANA}`).expect(200);
      expect((lista.body as { items: unknown[] }).items).toHaveLength(2);
    });
  });
});
