import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LIMITE_INICIAL, PESO_COSTO_INICIAL, RecomendacionesService } from './recomendaciones.service';

const receta = (id: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  recetaId: id,
  nombre,
  tipo: 'almuerzo',
  porciones: 4,
  ingredientes: [{ termino: 'arroz', cantidad: 0.4, unidad: 'kg' }],
  costoPorPorcion: 900,
  costoTotal: 3600,
  costoPorTienda: { jumbo: 3800, santa_isabel: null },
  cobertura: 1,
  ingredientesCompartidos: ['arroz'],
  ingredientesNuevos: [],
  sinPrecio: [],
  puntaje: 0.8,
  explicacion: ['Cuesta $900 por porción.', 'Reutiliza 1 de 1 ingredientes de tu semana (arroz).'],
  ...extra,
});

const respuesta = (recomendaciones = [receta('arroz-con-pollo', 'Arroz con pollo')], extra = {}) => ({
  semana: '2026-11-16',
  adaptativo: true,
  pesos: { costo: 0.6, reuso: 0.4 },
  ingredientesDelPlan: ['arroz'],
  excluidos: [],
  descartadas: { rechazadas: 1, porIngredienteExcluido: 2 },
  preciosActualizadosEn: { jumbo: '2026-11-21T15:00:00.000Z', santa_isabel: null },
  recomendaciones,
  ...extra,
});

/** Token con el correo en la carga, para que la clave de localStorage dependa del usuario. */
function iniciarSesion(email: string): void {
  const carga = btoa(JSON.stringify({ email })).replace(/\+/g, '-').replace(/\//g, '_');
  localStorage.setItem('menusmart_token', `a.${carga}.c`);
}

describe('RecomendacionesService', () => {
  let servicio: RecomendacionesService;
  let http: HttpTestingController;

  const esLista = (req: { method: string; url: string }) =>
    req.method === 'GET' && req.url.endsWith('/recommendations');
  const esPlan = (req: { method: string; url: string }) => req.method === 'GET' && req.url.endsWith('/meals');

  function crear(): void {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(RecomendacionesService);
    http = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    localStorage.clear();
    crear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    http.verify();
    localStorage.clear();
  });

  describe('cargar()', () => {
    it('pide la semana vista con los valores iniciales y convierte la respuesta', async () => {
      const carga = servicio.cargar();
      const peticion = http.expectOne(esLista);
      expect(peticion.request.params.get('semana')).toBe(servicio.semana());
      expect(peticion.request.params.get('pesoCosto')).toBe(String(PESO_COSTO_INICIAL));
      expect(peticion.request.params.get('adaptativo')).toBe('true');
      expect(peticion.request.params.get('limite')).toBe(String(LIMITE_INICIAL));
      expect(peticion.request.params.has('excluir')).toBe(false);
      expect(peticion.request.params.has('tipo')).toBe(false);
      expect(servicio.estado()).toBe('cargando');

      peticion.flush(respuesta());
      await carga;

      expect(servicio.estado()).toBe('listo');
      expect(servicio.sugerencias()[0]).toMatchObject({
        recetaId: 'arroz-con-pollo',
        tipo: 'Almuerzo',
        tipoApi: 'almuerzo',
        costoPorPorcion: 900,
        costoJumbo: 3800,
        costoSantaIsabel: null,
        compartidos: ['arroz'],
      });
      expect(servicio.sugerencias()[0].explicacion).toHaveLength(2);
      expect(servicio.resumen()).toMatchObject({
        adaptativo: true,
        descartadasRechazadas: 1,
        descartadasPorExclusion: 2,
        ingredientesDelPlan: ['arroz'],
        preciosJumbo: new Date('2026-11-21T15:00:00.000Z'),
        preciosSantaIsabel: null,
      });
    });

    it('envía los filtros elegidos', async () => {
      servicio.fijarPesoCosto(25);
      const a = servicio.alternarExcluido('pollo');
      http.expectOne(esLista).flush(respuesta());
      await a;
      const b = servicio.alternarExcluido('cebolla');
      http.expectOne(esLista).flush(respuesta());
      await b;
      const c = servicio.elegirTipo('cena');
      const peticion = http.expectOne(esLista);
      expect(peticion.request.params.get('pesoCosto')).toBe('25');
      expect(peticion.request.params.get('excluir')).toBe('pollo,cebolla');
      expect(peticion.request.params.get('tipo')).toBe('cena');
      peticion.flush(respuesta());
      await c;

      const d = servicio.activarAdaptacion(false);
      const ultima = http.expectOne(esLista);
      expect(ultima.request.params.get('adaptativo')).toBe('false');
      ultima.flush(respuesta());
      await d;
    });

    it('sin conexión muestra un error claro y permite reintentar', async () => {
      const carga = servicio.cargar();
      http.expectOne(esLista).error(new ProgressEvent('error'), { status: 0 });
      await carga;
      expect(servicio.estado()).toBe('error');
      expect(servicio.errorCarga()).toContain('No hay conexión');

      const reintento = servicio.cargar();
      http.expectOne(esLista).flush(respuesta());
      await reintento;
      expect(servicio.estado()).toBe('listo');
      expect(servicio.errorCarga()).toBeNull();
    });

    it('un error del servidor sin datos previos queda en estado de error', async () => {
      const carga = servicio.cargar();
      http.expectOne(esLista).flush('x', { status: 500, statusText: 'Server Error' });
      await carga;
      expect(servicio.estado()).toBe('error');
      expect(servicio.errorCarga()).toContain('No se pudieron cargar las sugerencias');
    });

    it('si ya había sugerencias y la recarga falla, las conserva y avisa', async () => {
      const primera = servicio.cargar();
      http.expectOne(esLista).flush(respuesta());
      await primera;

      const segunda = servicio.cargar();
      http.expectOne(esLista).flush('x', { status: 503, statusText: 'Unavailable' });
      await segunda;

      expect(servicio.estado()).toBe('listo');
      expect(servicio.sugerencias()).toHaveLength(1);
      expect(servicio.mensaje()?.tipo).toBe('error');
    });

    it('ignora una respuesta vieja que llega después de una más nueva', async () => {
      const vieja = servicio.cargar();
      const nueva = servicio.cargar();
      const [peticionVieja, peticionNueva] = http.match(esLista);
      peticionNueva.flush(respuesta([receta('b', 'Bistec')]));
      await nueva;
      peticionVieja.flush(respuesta([receta('a', 'Arroz')]));
      await vieja;

      expect(servicio.sugerencias().map((s) => s.nombre)).toEqual(['Bistec']);
    });

    it('un 400 pide revisar los filtros', async () => {
      const carga = servicio.cargar();
      http.expectOne(esLista).flush({ message: 'x' }, { status: 400, statusText: 'Bad Request' });
      await carga;
      expect(servicio.errorCarga()).toContain('filtros');
    });
  });

  describe('aceptar()', () => {
    it('envía receta, día y semana, recarga el plan y vuelve a pedir las sugerencias', async () => {
      const primera = servicio.cargar();
      http.expectOne(esLista).flush(respuesta());
      await primera;

      const aceptada = servicio.aceptar('arroz-con-pollo', 'miercoles', 'Miércoles');
      const post = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/recommendations/accept'));
      expect(post.request.body).toEqual({
        recetaId: 'arroz-con-pollo',
        diaSemana: 'miercoles',
        semana: servicio.semana(),
      });
      expect(servicio.ocupada()).toBe('arroz-con-pollo');
      post.flush({ id: 'c1' }, { status: 201, statusText: 'Created' });

      (await vi.waitFor(() => http.expectOne(esPlan))).flush([]);
      (await vi.waitFor(() => http.expectOne(esLista))).flush(respuesta());

      expect(await aceptada).toBe(true);
      expect(servicio.ocupada()).toBeNull();
      expect(servicio.mensaje()).toEqual({
        tipo: 'ok',
        texto: 'Agregamos "Arroz con pollo" al miércoles de tu semana.',
      });
    });

    it('si el servidor falla avisa y no recarga nada', async () => {
      const aceptada = servicio.aceptar('arroz-con-pollo', 'lunes', 'Lunes');
      http
        .expectOne((req) => req.url.endsWith('/recommendations/accept'))
        .flush('x', { status: 500, statusText: 'Server Error' });

      expect(await aceptada).toBe(false);
      expect(servicio.mensaje()).toMatchObject({ tipo: 'error' });
      expect(servicio.mensaje()?.texto).toContain('No se pudo agregar');
      expect(servicio.ocupada()).toBeNull();
    });

    it('no acepta otra mientras hay una acción en curso', async () => {
      const primera = servicio.aceptar('a', 'lunes', 'Lunes');
      expect(await servicio.aceptar('b', 'martes', 'Martes')).toBe(false);
      http.expectOne((req) => req.url.endsWith('/accept')).flush('x', { status: 500, statusText: 'x' });
      await primera;
    });
  });

  describe('rechazar()', () => {
    it('oculta la sugerencia, avisa al servidor y recarga', async () => {
      const primera = servicio.cargar();
      http.expectOne(esLista).flush(respuesta([receta('a', 'Arroz'), receta('b', 'Bistec')]));
      await primera;

      const rechazada = servicio.rechazar('a');
      const post = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/recommendations/reject'));
      expect(post.request.body).toEqual({ recetaId: 'a' });
      post.flush(null, { status: 204, statusText: 'No Content' });

      await vi.waitFor(() => expect(servicio.sugerencias().map((s) => s.recetaId)).toEqual(['b']));
      (await vi.waitFor(() => http.expectOne(esLista))).flush(
        respuesta([receta('b', 'Bistec')], { descartadas: { rechazadas: 2, porIngredienteExcluido: 0 } }),
      );

      expect(await rechazada).toBe(true);
      expect(servicio.resumen()?.descartadasRechazadas).toBe(2);
    });

    it('si falla no oculta la sugerencia', async () => {
      const primera = servicio.cargar();
      http.expectOne(esLista).flush(respuesta([receta('a', 'Arroz')]));
      await primera;

      const rechazada = servicio.rechazar('a');
      http
        .expectOne((req) => req.url.endsWith('/reject'))
        .flush('x', { status: 500, statusText: 'Server Error' });

      expect(await rechazada).toBe(false);
      expect(servicio.sugerencias()).toHaveLength(1);
      expect(servicio.mensaje()?.texto).toContain('No se pudo descartar');
    });
  });

  describe('restablecer()', () => {
    it('borra los rechazos en el servidor y vuelve a pedir las sugerencias', async () => {
      const restablecida = servicio.restablecer();
      const borrar = http.expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/recommendations/feedback'));
      borrar.flush(null, { status: 204, statusText: 'No Content' });

      (await vi.waitFor(() => http.expectOne(esLista))).flush(
        respuesta([receta('a', 'Arroz')], { descartadas: { rechazadas: 0, porIngredienteExcluido: 0 } }),
      );

      expect(await restablecida).toBe(true);
      expect(servicio.resumen()?.descartadasRechazadas).toBe(0);
      expect(servicio.mensaje()?.tipo).toBe('ok');
    });

    it('si falla avisa', async () => {
      const restablecida = servicio.restablecer();
      http.expectOne((req) => req.method === 'DELETE').flush('x', { status: 500, statusText: 'x' });
      expect(await restablecida).toBe(false);
      expect(servicio.mensaje()?.tipo).toBe('error');
    });
  });

  describe('comodidades en localStorage', () => {
    const clave = (email: string) => `menusmart_sugerencias_${email}`;

    it('guarda peso, excluidos y adaptación por usuario, y los recupera', async () => {
      iniciarSesion('ana@test.cl');
      servicio.fijarPesoCosto(30);
      const a = servicio.alternarExcluido('pollo');
      http.expectOne(esLista).flush(respuesta());
      await a;
      const b = servicio.activarAdaptacion(false);
      http.expectOne(esLista).flush(respuesta());
      await b;

      expect(JSON.parse(localStorage.getItem(clave('ana@test.cl')) ?? '{}')).toEqual({
        pesoCosto: 30,
        excluidos: ['pollo'],
        adaptativo: false,
      });

      // Otra instancia del servicio (app recién abierta) lee lo guardado al cargar.
      TestBed.resetTestingModule();
      crear();
      iniciarSesion('ana@test.cl');
      const carga = servicio.cargar();
      const peticion = http.expectOne(esLista);
      expect(peticion.request.params.get('pesoCosto')).toBe('30');
      expect(peticion.request.params.get('excluir')).toBe('pollo');
      expect(peticion.request.params.get('adaptativo')).toBe('false');
      peticion.flush(respuesta());
      await carga;
      expect(servicio.pesoCosto()).toBe(30);
      expect(servicio.excluidos()).toEqual(['pollo']);
      expect(servicio.adaptativo()).toBe(false);
    });

    it('no mezcla las comodidades de dos cuentas', async () => {
      localStorage.setItem(
        clave('ana@test.cl'),
        JSON.stringify({ pesoCosto: 10, excluidos: ['pan'], adaptativo: false }),
      );
      iniciarSesion('beto@test.cl');
      const carga = servicio.cargar();
      const peticion = http.expectOne(esLista);
      expect(peticion.request.params.get('pesoCosto')).toBe(String(PESO_COSTO_INICIAL));
      expect(peticion.request.params.has('excluir')).toBe(false);
      peticion.flush(respuesta());
      await carga;
    });

    it('descarta datos guardados que no son válidos', async () => {
      iniciarSesion('ana@test.cl');
      localStorage.setItem(
        clave('ana@test.cl'),
        JSON.stringify({ pesoCosto: 'x', excluidos: ['pollo', 'unicornio', 4], adaptativo: 'si' }),
      );
      const carga = servicio.cargar();
      const peticion = http.expectOne(esLista);
      expect(peticion.request.params.get('pesoCosto')).toBe(String(PESO_COSTO_INICIAL));
      expect(peticion.request.params.get('excluir')).toBe('pollo');
      expect(peticion.request.params.get('adaptativo')).toBe('true');
      peticion.flush(respuesta());
      await carga;
    });

    it('funciona aunque localStorage falle al leer y al escribir', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('lleno');
      });

      servicio.fijarPesoCosto(80);
      expect(servicio.pesoCosto()).toBe(80);

      const carga = servicio.cargar();
      http.expectOne(esLista).flush(respuesta());
      await carga;
      expect(servicio.estado()).toBe('listo');

      const excluida = servicio.alternarExcluido('pollo');
      http.expectOne(esLista).flush(respuesta());
      await excluida;
      expect(servicio.excluidos()).toEqual(['pollo']);
    });

    it('limita el peso a 0-100 y no acepta ingredientes fuera del catálogo', async () => {
      servicio.fijarPesoCosto(250);
      expect(servicio.pesoCosto()).toBe(100);
      servicio.fijarPesoCosto(-3);
      expect(servicio.pesoCosto()).toBe(0);
      await servicio.alternarExcluido('unicornio');
      expect(servicio.excluidos()).toEqual([]);
    });
  });
});
