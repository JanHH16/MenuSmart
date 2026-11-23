import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ListaComprasPage } from './lista-compras.page';

const lista = {
  id: 'l1',
  semana: '2026-11-23',
  items: [
    {
      id: 'i1',
      nombre: 'arroz',
      cantidad: 1.5,
      unidad: 'kg',
      categoria: 'despensa',
      comprado: false,
      nombresOriginales: ['Arroz'],
      reglas: ['nombre:exacto'],
      costo: { tiendas: { jumbo: { total: 3000 }, santa_isabel: { total: 2400 } } },
    },
    {
      id: 'i2',
      nombre: 'cilantro',
      cantidad: 0.045,
      unidad: 'l',
      categoria: null,
      comprado: true,
      nombresOriginales: ['Cilantro'],
      reglas: [],
      costo: { tiendas: { jumbo: null, santa_isabel: null } },
    },
  ],
  resumen: {
    itemsTotal: 2,
    itemsComparables: 1,
    itemsSinPrecio: 1,
    comparable: { totales: { jumbo: 3000, santa_isabel: 2400 }, masBarata: 'santa_isabel', ahorro: 600 },
  },
};

describe('ListaComprasPage', () => {
  let component: ListaComprasPage;
  let fixture: ComponentFixture<ListaComprasPage>;
  let http: HttpTestingController;

  const esLista = (req: { url: string }) => req.url.endsWith('/shopping-lists');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaComprasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('agrupa por categoría, formatea cantidades y calcula el avance', async () => {
    http.expectOne((req) => req.url.endsWith('/meals'));
    http.expectOne(esLista).flush(lista);
    await fixture.whenStable();

    expect(component.categorias().map((c) => c.nombre)).toEqual(['Despensa', 'Otros']);
    expect(component.categorias()[0].items[0]).toMatchObject({ nombre: 'Arroz', cantidad: '1,5 kg' });
    expect(component.totalItems()).toBe(2);
    expect(component.itemsComprados()).toBe(1);
    expect(component.progresoPorcentaje()).toBe(50);
    expect(component.resumen()).toMatchObject({ masBarata: 'Santa Isabel', ahorro: 600 });
  });

  it('el costo estimado solo cuenta lo que falta comprar y se recalcula al marcar', async () => {
    http.expectOne((req) => req.url.endsWith('/meals'));
    http.expectOne(esLista).flush(lista);
    await fixture.whenStable();

    // Arroz sin marcar: entra en el costo. Cilantro ya marcado: queda fuera.
    expect(component.resumen()).toMatchObject({ itemsTotal: 1, itemsComparables: 1, totalJumbo: 3000, totalSantaIsabel: 2400 });

    // Al marcar el arroz ("ya lo tengo") ya no queda nada por comprar.
    component.alternar('i1');
    http.expectOne((req) => req.method === 'PATCH' && req.url.endsWith('/items/i1')).flush(null);
    await fixture.whenStable();
    expect(component.resumen()).toMatchObject({ itemsTotal: 0, itemsComparables: 0, masBarata: null, ahorro: 0 });
  });

  it('ofrece generar la lista cuando todavía no existe (404)', async () => {
    http.expectOne((req) => req.url.endsWith('/meals'));
    http.expectOne(esLista).flush({ message: 'no hay' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(component.estado()).toBe('sin_lista');
  });

  it('marca un producto como comprado al instante y lo revierte si falla el guardado', async () => {
    http.expectOne((req) => req.url.endsWith('/meals'));
    http.expectOne(esLista).flush(lista);
    await fixture.whenStable();

    component.alternar('i1');
    expect(component.itemsComprados()).toBe(2);
    http
      .expectOne((req) => req.method === 'PATCH' && req.url.endsWith('/items/i1'))
      .flush('error', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(component.itemsComprados()).toBe(1);
    expect(component.mensaje()).toContain('No se pudo guardar');
  });

  it('explica qué falta cuando el plan no tiene ingredientes (422)', async () => {
    http.expectOne((req) => req.url.endsWith('/meals'));
    http.expectOne(esLista).flush({}, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    component.generar();
    http
      .expectOne((req) => req.method === 'POST' && req.url.endsWith('/generate'))
      .flush({}, { status: 422, statusText: 'Unprocessable' });
    await fixture.whenStable();

    expect(component.mensaje()).toContain('Agrega comidas con ingredientes');
    expect(component.generando()).toBe(false);
  });
});
