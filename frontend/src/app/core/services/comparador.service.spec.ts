import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComparadorService } from './comparador.service';

const precio = (valor: number, desactualizado = false) => ({ precio: valor, desactualizado });

const comparacion = {
  ultimaActualizacion: { jumbo: '2026-11-21T15:00:00.000Z', santa_isabel: null },
  comunes: [
    {
      slug: 'arroz-1kg',
      nombre: 'Arroz 1 kg',
      unidad: 'kg',
      cantidad: 1,
      tiendas: { jumbo: precio(2000), santa_isabel: precio(1500, true) },
    },
    {
      slug: 'aceite-900ml',
      nombre: 'Aceite 900 ml',
      unidad: 'l',
      cantidad: 0.9,
      tiendas: { jumbo: precio(3000), santa_isabel: precio(3500) },
    },
  ],
};

describe('ComparadorService', () => {
  let servicio: ComparadorService;
  let http: HttpTestingController;

  const esCompare = (req: { url: string }) => req.url.endsWith('/prices/compare');

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ComparadorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('cargar()', () => {
    it('convierte la respuesta del backend en productos con un precio por tienda', () => {
      servicio.cargar();
      http.expectOne(esCompare).flush(comparacion);

      expect(servicio.estado()).toBe('listo');
      expect(servicio.productos()[0]).toMatchObject({
        producto: 'Arroz 1 kg',
        cantidad: '1 kg',
        precios: [2000, 1500],
        desactualizado: true,
      });
      expect(servicio.productos()[1].cantidad).toBe('0,9 L');
      expect(servicio.ultimaActualizacion().jumbo).toEqual(new Date('2026-11-21T15:00:00.000Z'));
      expect(servicio.ultimaActualizacion().santaIsabel).toBeNull();
    });

    it('suma los totales por tienda e indica cuál conviene y cuánto se ahorra', () => {
      servicio.cargar();
      http.expectOne(esCompare).flush(comparacion);

      expect(servicio.totales()).toEqual([5000, 5000]);
      expect(servicio.tiendaMasBarata()).toEqual({ indice: null, ahorro: 0 });
    });

    it('elige la tienda más barata cuando los totales difieren', () => {
      servicio.cargar();
      http.expectOne(esCompare).flush({ ...comparacion, comunes: [comparacion.comunes[0]] });

      expect(servicio.tiendaMasBarata()).toEqual({ indice: 1, ahorro: 500 });
      expect(servicio.hayDesactualizados()).toBe(true);
    });

    it('queda en error si el backend falla y no había datos', () => {
      servicio.cargar();
      http.expectOne(esCompare).flush('error', { status: 500, statusText: 'Server Error' });

      expect(servicio.estado()).toBe('error');
    });

    it('conserva los últimos datos si una recarga falla', () => {
      servicio.cargar();
      http.expectOne(esCompare).flush(comparacion);
      servicio.cargar();
      http.expectOne(esCompare).flush('error', { status: 500, statusText: 'Server Error' });

      expect(servicio.estado()).toBe('listo');
      expect(servicio.productos()).toHaveLength(2);
    });
  });

  describe('actualizar()', () => {
    const esRefresh = (req: { url: string }) => req.url.endsWith('/prices/refresh');

    it('explica que ya hay una actualización en curso (409)', () => {
      servicio.actualizar();
      http.expectOne(esRefresh).flush({}, { status: 409, statusText: 'Conflict' });

      expect(servicio.mensaje()).toContain('en curso');
      expect(servicio.actualizando()).toBe(false);
    });

    it('explica cuánto esperar cuando se actualizó hace poco (429)', () => {
      servicio.actualizar();
      http
        .expectOne(esRefresh)
        .flush({ retryAfterSeconds: 400 }, { status: 429, statusText: 'Too Many Requests' });

      expect(servicio.mensaje()).toContain('7 min');
      expect(servicio.actualizando()).toBe(false);
    });

    it('consulta el avance de las corridas y recarga la comparación al terminar', () => {
      vi.useFakeTimers();
      try {
        servicio.actualizar();
        http.expectOne(esRefresh).flush([
          { id: 'a', estado: 'en_curso' },
          { id: 'b', estado: 'en_curso' },
        ]);
        expect(servicio.actualizando()).toBe(true);

        vi.advanceTimersByTime(0);
        http.expectOne((req) => req.url.endsWith('/prices/runs/a')).flush({ id: 'a', estado: 'ok' });
        http.expectOne((req) => req.url.endsWith('/prices/runs/b')).flush({ id: 'b', estado: 'en_curso' });
        expect(servicio.actualizando()).toBe(true);

        vi.advanceTimersByTime(3000);
        http.expectOne((req) => req.url.endsWith('/prices/runs/a')).flush({ id: 'a', estado: 'ok' });
        http.expectOne((req) => req.url.endsWith('/prices/runs/b')).flush({ id: 'b', estado: 'ok' });

        expect(servicio.actualizando()).toBe(false);
        http.expectOne(esCompare).flush(comparacion);
        expect(servicio.productos()).toHaveLength(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
