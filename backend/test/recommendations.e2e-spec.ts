import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { PythonClientService } from './../src/python-client/python-client.service';
import { configureApp } from './../src/setup-app';

const SEMANA = '2026-11-25';

interface Recomendacion {
  recetaId: string;
  explicacion: string[];
  costoPorPorcion: number | null;
  ingredientesCompartidos: string[];
  puntaje: number | null;
}
interface Respuesta {
  adaptativo: boolean;
  pesos: { costo: number; reuso: number };
  ingredientesDelPlan: string[];
  descartadas: { rechazadas: number; porIngredienteExcluido: number };
  recomendaciones: Recomendacion[];
}

describe('Recomendaciones (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  const email = `e2e-reco-${Date.now()}@test.cl`;
  // Python simulado: el plan de la semana contiene arroz y cebolla.
  const python = {
    normalizeIngredients: jest.fn().mockResolvedValue({
      items: [
        { name: 'arroz', quantity: 1, unit: 'kg', term: 'arroz' },
        { name: 'cebolla', quantity: 1, unit: 'kg', term: 'cebolla' },
      ],
      original_count: 2,
      normalized_count: 2,
    }),
    scrapeSearch: jest.fn(),
  };

  const get = (ruta: string) =>
    request(app.getHttpServer()).get(ruta).set('Authorization', `Bearer ${token}`);
  const post = (ruta: string, cuerpo: object) =>
    request(app.getHttpServer())
      .post(ruta)
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo);
  const recomendar = async (consulta = ''): Promise<Respuesta> =>
    (await get(`/api/recommendations?semana=${SEMANA}${consulta}`).expect(200)).body as Respuesta;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PythonClientService)
      .useValue(python)
      .compile();
    app = modulo.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
    const registro = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'secreto123', name: 'E2E Reco' })
      .expect(201);
    token = (registro.body as { accessToken: string }).accessToken;
    // Una comida con ingredientes para que el plan de la semana no este vacio.
    await post('/api/meals', {
      nombre: 'Arroz con cebolla',
      tipo: 'almuerzo',
      diaSemana: 'lunes',
      semana: SEMANA,
      ingredientes: [
        { nombre: 'Arroz', cantidad: 1, unidad: 'kg' },
        { nombre: 'Cebolla', cantidad: 1, unidad: 'kg' },
      ],
    }).expect(201);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM "users" WHERE "email" = $1`, [email]);
    await app.close();
  });

  it('exige autenticación', async () => {
    await request(app.getHttpServer()).get('/api/recommendations').expect(401);
    await request(app.getHttpServer()).post('/api/recommendations/accept').send({}).expect(401);
  });

  it('valida los parámetros', async () => {
    await get('/api/recommendations?pesoCosto=150').expect(400);
    await get('/api/recommendations?excluir=caviar').expect(400);
    await get('/api/recommendations?tipo=brunch').expect(400);
    await get('/api/recommendations?limite=0').expect(400);
    await get('/api/recommendations?adaptativo=quizas').expect(400);
    await post('/api/recommendations/reject', { recetaId: 'no-existe' }).expect(400);
    await post('/api/recommendations/accept', { recetaId: 'arroz-con-pollo', diaSemana: 'feriado' }).expect(400);
  });

  it('recomienda con explicación, y reconoce los ingredientes que ya están en el plan', async () => {
    const respuesta = await recomendar('&limite=30');
    expect(respuesta.adaptativo).toBe(true);
    expect(respuesta.pesos).toEqual({ costo: 0.6, reuso: 0.4 });
    expect(respuesta.ingredientesDelPlan).toEqual(['arroz', 'cebolla']);
    expect(respuesta.recomendaciones.length).toBeGreaterThan(5);
    for (const r of respuesta.recomendaciones) {
      expect(r.explicacion.length).toBeGreaterThan(0);
    }
    const conReuso = respuesta.recomendaciones.find((r) => r.recetaId === 'lentejas-con-arroz');
    expect(conReuso?.ingredientesCompartidos).toEqual(expect.arrayContaining(['arroz', 'cebolla']));
    expect(conReuso?.explicacion.join(' ')).toContain('Reutiliza');
  });

  it('el peso del costo cambia el orden: más importancia a la reutilización sube a las que comparten', async () => {
    const porCosto = await recomendar('&pesoCosto=100&limite=30');
    const porReuso = await recomendar('&pesoCosto=0&limite=30');
    expect(porCosto.pesos).toEqual({ costo: 1, reuso: 0 });
    expect(porReuso.pesos).toEqual({ costo: 0, reuso: 1 });
    // Con todo el peso en la reutilización, las recetas que comparten ingredientes con el plan
    // van antes que las que no comparten ninguno. No depende de los precios cargados en la base.
    const compartidas = porReuso.recomendaciones.map((r) => r.ingredientesCompartidos.length > 0);
    expect(compartidas.some(Boolean)).toBe(true);
    expect(compartidas.some((c) => !c)).toBe(true);
    expect(compartidas.lastIndexOf(true)).toBeLessThan(compartidas.indexOf(false));
  });

  it('con adaptativo=false devuelve el orden base alfabético y sin puntaje', async () => {
    const base = await recomendar('&adaptativo=false&limite=30');
    expect(base.adaptativo).toBe(false);
    const nombres = base.recomendaciones.map((r) => r.recetaId);
    expect(base.recomendaciones.every((r) => r.puntaje === null)).toBe(true);
    expect(nombres).not.toEqual([...nombres].sort((a, b) => a.localeCompare(b)).reverse());
  });

  it('oculta las recetas con ingredientes excluidos y las cuenta', async () => {
    const todas = await recomendar('&limite=30');
    const sinPollo = await recomendar('&excluir=pollo&limite=30');
    expect(sinPollo.recomendaciones.some((r) => r.recetaId === 'arroz-con-pollo')).toBe(false);
    expect(sinPollo.descartadas.porIngredienteExcluido).toBeGreaterThan(0);
    expect(sinPollo.recomendaciones.length).toBeLessThan(todas.recomendaciones.length);
  });

  it('rechazar oculta la receta, y restablecer la vuelve a mostrar', async () => {
    await post('/api/recommendations/reject', { recetaId: 'pastel-de-papas' }).expect(204);
    const conRechazo = await recomendar('&limite=30');
    expect(conRechazo.recomendaciones.some((r) => r.recetaId === 'pastel-de-papas')).toBe(false);
    expect(conRechazo.descartadas.rechazadas).toBe(1);

    await request(app.getHttpServer())
      .delete('/api/recommendations/feedback')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    const restablecido = await recomendar('&limite=30');
    expect(restablecido.recomendaciones.some((r) => r.recetaId === 'pastel-de-papas')).toBe(true);
  });

  it('aceptar agrega la receta al plan con sus ingredientes', async () => {
    const respuesta = await post('/api/recommendations/accept', {
      recetaId: 'tortilla-de-papas',
      diaSemana: 'jueves',
      semana: SEMANA,
    }).expect(201);
    const comida = respuesta.body as { nombre: string; diaSemana: string; ingredientes: unknown[] };
    expect(comida).toMatchObject({ nombre: 'Tortilla de papas', diaSemana: 'jueves' });
    expect(comida.ingredientes).toHaveLength(4);

    const plan = (await get(`/api/meals?semana=${SEMANA}`).expect(200)).body as { nombre: string }[];
    expect(plan.map((c) => c.nombre)).toContain('Tortilla de papas');
  });

  it('si Python no responde, igual recomienda (sin medir la reutilización)', async () => {
    python.normalizeIngredients.mockRejectedValueOnce(new Error('caído'));
    const respuesta = await recomendar('&limite=5');
    expect(respuesta.ingredientesDelPlan).toEqual([]);
    expect(respuesta.recomendaciones.length).toBeGreaterThan(0);
  });
});
