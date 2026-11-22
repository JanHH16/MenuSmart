import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { LayoutService } from '../../../core/services/layout.service';
import { SugerenciasPage } from './sugerencias.page';

const receta = (id: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  recetaId: id,
  nombre,
  tipo: 'almuerzo',
  porciones: 4,
  ingredientes: [
    { termino: 'arroz', cantidad: 0.4, unidad: 'kg' },
    { termino: 'pollo', cantidad: 0.8, unidad: 'kg' },
  ],
  costoPorPorcion: 1250,
  costoTotal: 5000,
  costoPorTienda: { jumbo: 5200, santa_isabel: null },
  cobertura: 1,
  ingredientesCompartidos: ['arroz'],
  ingredientesNuevos: ['pollo'],
  sinPrecio: [],
  puntaje: 0.7,
  explicacion: ['Cuesta $1.250 por porción, 12% menos que el promedio de las recetas.'],
  ...extra,
});

const respuesta = (recomendaciones: unknown[], extra: Record<string, unknown> = {}) => ({
  semana: '2026-11-16',
  adaptativo: true,
  pesos: { costo: 0.6, reuso: 0.4 },
  ingredientesDelPlan: ['arroz'],
  excluidos: [],
  descartadas: { rechazadas: 0, porIngredienteExcluido: 0 },
  preciosActualizadosEn: { jumbo: '2026-11-21T15:00:00.000Z', santa_isabel: '2026-11-21T15:00:00.000Z' },
  recomendaciones,
  ...extra,
});

describe('SugerenciasPage', () => {
  let fixture: ComponentFixture<SugerenciasPage>;
  let http: HttpTestingController;

  const esLista = (req: { method: string; url: string }) =>
    req.method === 'GET' && req.url.endsWith('/recommendations');
  const esPlan = (req: { method: string; url: string }) => req.method === 'GET' && req.url.endsWith('/meals');
  const el = () => fixture.nativeElement as HTMLElement;

  async function asentar(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function botones(texto: string): HTMLButtonElement[] {
    return [...el().querySelectorAll('button')].filter(
      (b) => (b.textContent ?? '').includes(texto) || (b.getAttribute('aria-label') ?? '').includes(texto),
    );
  }

  function boton(texto: string): HTMLButtonElement {
    const encontrados = botones(texto);
    if (encontrados.length === 0) {
      throw new Error(`No hay un botón con "${texto}"`);
    }
    return encontrados[0];
  }

  /** Crea la página y responde la carga inicial (plan vacío y sugerencias dadas). */
  async function abrir(
    sugerencias: unknown[],
    extra: Record<string, unknown> = {},
    desktop = false,
  ): Promise<TestRequest> {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(desktop ? [{ provide: LayoutService, useValue: { esDesktop$: of(true) } }] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SugerenciasPage);
    fixture.detectChanges();
    http.expectOne(esPlan).flush([]);
    const lista = http.expectOne(esLista);
    lista.flush(respuesta(sugerencias, extra));
    await asentar();
    return lista;
  }

  afterEach(() => {
    localStorage.clear();
  });

  it('muestra las tarjetas con costo, tiendas, explicación e ingredientes compartidos', async () => {
    await abrir([
      receta('arroz-con-pollo', 'Arroz con pollo'),
      receta('lentejas', 'Lentejas', {
        costoPorPorcion: null,
        costoPorTienda: { jumbo: null, santa_isabel: null },
        ingredientesCompartidos: [],
        sinPrecio: ['lentejas', 'salsa de tomate'],
        explicacion: ['No hay precios suficientes para estimar su costo; se muestra al final.'],
      }),
    ]);

    const tarjetas = el().querySelectorAll('article');
    expect(tarjetas).toHaveLength(2);
    const primera = (tarjetas[0].textContent ?? '').replace(/\s+/g, ' ');
    expect(primera).toContain('Arroz con pollo');
    expect(primera).toContain('Almuerzo');
    expect(primera).toContain('$1.250');
    expect(primera).toContain('por porción');
    expect(primera).toContain('Todo en Jumbo');
    expect(primera).toContain('$5.200');
    expect(primera).toContain('Todo en Santa Isabel: sin precio completo');
    expect(primera).toContain('12% menos que el promedio');
    expect(primera).toContain('Ya lo usas en tu semana');
    expect(tarjetas[0].querySelector('.ms-sug-chip-compartido')?.textContent).toContain('Arroz');

    const segunda = (tarjetas[1].textContent ?? '').replace(/\s+/g, ' ');
    expect(segunda).toContain('sin precio suficiente');
    expect(segunda).toContain('Sin precio para Lentejas, Salsa de tomate');
    expect(tarjetas[0].textContent).not.toContain('Sin precio para');
  });

  it('muestra los controles con etiquetas y el panel "Cómo se calcula"', async () => {
    await abrir([receta('a', 'Arroz con pollo')]);

    expect(el().querySelector('label[for="sug-adaptativo"]')?.textContent).toContain('Sugerencias adaptativas');
    expect(el().querySelector('label[for="sug-peso"]')?.textContent).toContain('Importancia del costo: 60%');
    const interruptor = el().querySelector('#sug-adaptativo') as HTMLInputElement;
    expect(interruptor.getAttribute('role')).toBe('switch');
    expect(interruptor.checked).toBe(true);
    expect(el().querySelectorAll('details.ms-sug-excluir button')).toHaveLength(31);
    const como = el().querySelector('details.ms-sug-como')?.textContent ?? '';
    expect(como).toContain('Costo por porción');
    expect(como).toContain('Ingredientes que ya usas');
    expect(como).toContain('costo vale 60%');
    expect(como).toContain('No se arma ningún perfil');
  });

  it('también se arma en la vista de escritorio', async () => {
    await abrir([receta('a', 'Arroz con pollo')], {}, true);

    expect(el().querySelector('.ms-sug-desktop')).not.toBeNull();
    expect(el().querySelectorAll('article')).toHaveLength(1);
    expect(el().querySelector('#sug-peso')).not.toBeNull();
  });

  it('agregar a mi semana pide el día y envía el POST con ese día', async () => {
    await abrir([receta('arroz-con-pollo', 'Arroz con pollo')]);
    expect(el().querySelector('.ms-sug-dias')).toBeNull();

    boton('Agregar a mi semana').click();
    await asentar();
    expect(el().querySelector('.ms-sug-dias')).not.toBeNull();

    boton('el Miércoles').click();
    const post = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/recommendations/accept'));
    expect(post.request.body).toMatchObject({ recetaId: 'arroz-con-pollo', diaSemana: 'miercoles' });
    post.flush({ id: 'c1' }, { status: 201, statusText: 'Created' });

    // Tras aceptar se recarga el plan y las sugerencias.
    (await vi.waitFor(() => http.expectOne(esPlan))).flush([
      { id: 'c1', nombre: 'Arroz con pollo', tipo: 'almuerzo', diaSemana: 'miercoles', notas: null, ingredientes: [] },
    ]);
    (await vi.waitFor(() => http.expectOne(esLista))).flush(respuesta([receta('arroz-con-pollo', 'Arroz con pollo')]));
    await vi.waitFor(() => expect(fixture.componentInstance.ocupada()).toBeNull());
    await asentar();

    expect(el().querySelector('[role="status"].ms-sug-aviso')?.textContent).toContain('al miércoles de tu semana');
    expect(el().querySelector('.ms-sug-dias')).toBeNull();
    expect(el().querySelector('.ms-sug-tag-plan')?.textContent).toContain('ya en tu semana');
  });

  it('si el servidor falla al agregar avisa con un alert y deja elegir de nuevo', async () => {
    await abrir([receta('a', 'Arroz con pollo')]);
    boton('Agregar a mi semana').click();
    await asentar();
    boton('el Lunes').click();
    http
      .expectOne((req) => req.url.endsWith('/recommendations/accept'))
      .flush('x', { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => expect(fixture.componentInstance.ocupada()).toBeNull());
    await asentar();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('No se pudo agregar');
    expect(el().querySelector('.ms-sug-dias')).not.toBeNull();
  });

  it('"No me interesa" envía el rechazo y oculta la tarjeta', async () => {
    await abrir([receta('a', 'Arroz con pollo'), receta('b', 'Tallarines')]);

    boton('No me interesa: Arroz con pollo').click();
    const post = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/recommendations/reject'));
    expect(post.request.body).toEqual({ recetaId: 'a' });
    post.flush(null, { status: 204, statusText: 'No Content' });

    await vi.waitFor(() => expect(fixture.componentInstance.sugerencias().map((s) => s.recetaId)).toEqual(['b']));
    (await vi.waitFor(() => http.expectOne(esLista))).flush(
      respuesta([receta('b', 'Tallarines')], { descartadas: { rechazadas: 1, porIngredienteExcluido: 0 } }),
    );
    await vi.waitFor(() => expect(fixture.componentInstance.ocupada()).toBeNull());
    await asentar();

    const nombres = [...el().querySelectorAll('article h3')].map((h) => h.textContent?.trim());
    expect(nombres).toEqual(['Tallarines']);
    expect(el().textContent).toContain('1 descartada por ti');
    expect(el().querySelector('[role="status"].ms-sug-aviso')?.textContent).toContain('Descartamos "Arroz con pollo"');
    // El foco pasa a la tarjeta que ocupa su lugar en vez de perderse.
    expect(document.activeElement?.id).toBe('sug-titulo-b');
  });

  it('"Volver a mostrar las descartadas" aparece solo si hay rechazadas y las restablece', async () => {
    await abrir([receta('a', 'Arroz con pollo')]);
    expect(botones('Volver a mostrar las descartadas')).toHaveLength(0);

    TestBed.resetTestingModule();
    await abrir([receta('a', 'Arroz con pollo')], { descartadas: { rechazadas: 2, porIngredienteExcluido: 0 } });
    expect(el().textContent).toContain('2 descartadas por ti');

    boton('Volver a mostrar las descartadas').click();
    http.expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/recommendations/feedback')).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    (await vi.waitFor(() => http.expectOne(esLista))).flush(respuesta([receta('a', 'Arroz con pollo'), receta('z', 'Zapallo')]));
    await vi.waitFor(() => expect(fixture.componentInstance.ocupada()).toBeNull());
    await asentar();

    expect(el().querySelectorAll('article')).toHaveLength(2);
    expect(botones('Volver a mostrar las descartadas')).toHaveLength(0);
  });

  it('apagar la adaptación pide el orden base, lo explica y desactiva el deslizador', async () => {
    await abrir([receta('a', 'Arroz con pollo')]);
    const deslizador = el().querySelector('#sug-peso') as HTMLInputElement;
    expect(deslizador.disabled).toBe(false);

    (el().querySelector('#sug-adaptativo') as HTMLInputElement).click();
    const peticion = http.expectOne(esLista);
    expect(peticion.request.params.get('adaptativo')).toBe('false');
    peticion.flush(
      respuesta([receta('a', 'Arroz con pollo', { puntaje: null, explicacion: ['Orden alfabético: la adaptación está desactivada.'] })], {
        adaptativo: false,
      }),
    );
    await asentar();

    expect(el().querySelector('.ms-sug-switch-texto')?.textContent).toContain('orden alfabético');
    expect((el().querySelector('#sug-peso') as HTMLInputElement).disabled).toBe(true);
    expect(el().querySelector('article')?.textContent).toContain('Orden alfabético');
  });

  it('mover el deslizador cambia el valor al instante y consulta al soltarlo', async () => {
    await abrir([receta('a', 'Arroz con pollo')]);
    const deslizador = el().querySelector('#sug-peso') as HTMLInputElement;

    deslizador.value = '20';
    deslizador.dispatchEvent(new Event('input'));
    http.expectNone(esLista);
    await asentar();
    expect(el().querySelector('label[for="sug-peso"]')?.textContent).toContain('20%');
    expect(deslizador.getAttribute('aria-valuetext')).toContain('20 por ciento');

    deslizador.dispatchEvent(new Event('change'));
    http.expectNone(esLista); // espera una pausa corta por si se sigue moviendo
    await new Promise((resolver) => setTimeout(resolver, 350));
    const peticion = http.expectOne(esLista);
    expect(peticion.request.params.get('pesoCosto')).toBe('20');
    peticion.flush(respuesta([receta('a', 'Arroz con pollo')]));
  });

  it('excluir un ingrediente y filtrar por tipo se envían al backend', async () => {
    await abrir([receta('a', 'Arroz con pollo')]);

    boton('Pollo').click();
    const excluir = http.expectOne(esLista);
    expect(excluir.request.params.get('excluir')).toBe('pollo');
    excluir.flush(
      respuesta([], { excluidos: ['pollo'], descartadas: { rechazadas: 0, porIngredienteExcluido: 3 } }),
    );
    await asentar();

    expect(boton('Pollo').getAttribute('aria-pressed')).toBe('true');
    expect(el().textContent).toContain('3 recetas ocultas por los ingredientes que excluiste');
    expect(el().textContent).toContain('No hay sugerencias con esos filtros');

    boton('Cena').click();
    const tipo = http.expectOne(esLista);
    expect(tipo.request.params.get('tipo')).toBe('cena');
    tipo.flush(respuesta([receta('c', 'Tortilla', { tipo: 'cena' })]));
    await asentar();
    expect(boton('Cena').getAttribute('aria-pressed')).toBe('true');
    expect(el().querySelectorAll('article')).toHaveLength(1);
  });

  it('muestra el error con un alert y reintenta', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SugerenciasPage);
    fixture.detectChanges();
    http.expectOne(esPlan).flush([]);
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Buscando sugerencias');
    http.expectOne(esLista).error(new ProgressEvent('error'), { status: 0 });
    await asentar();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('No hay conexión');

    boton('Reintentar').click();
    http.expectOne(esLista).flush(respuesta([receta('a', 'Arroz con pollo')]));
    await asentar();
    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(el().querySelectorAll('article')).toHaveLength(1);
  });

  it('el botón Volver regresa al plan semanal', async () => {
    await abrir([]);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    (el().querySelector('ion-button') as HTMLElement).click();
    expect(navegar).toHaveBeenCalledWith('/tabs/plan-semanal');
  });
});
