import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComparadorPage } from './comparador.page';
import { PrecioProducto } from '../../core/services/comparador.service';
import { ListaComprasService } from '../../core/services/lista-compras.service';

describe('ComparadorPage', () => {
  let component: ComparadorPage;
  let fixture: ComponentFixture<ComparadorPage>;

  let http: HttpTestingController;
  let cargaInicial: TestRequest;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ComparadorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    cargaInicial = http.expectOne((req) => req.url.endsWith('/prices/compare'));
    // La pagina tambien pide tu lista de compras para compararla; aqui no importa su contenido.
    http
      .expectOne((req) => req.url.endsWith('/shopping-lists'))
      .flush('no hay lista', { status: 404, statusText: 'Not Found' });
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('pide la comparación al backend al abrirse y muestra el estado de carga', () => {
    expect(component.estado()).toBe('cargando');
  });

  it('pasa a "error" si el backend no responde y no hay datos', () => {
    cargaInicial.flush('error', { status: 500, statusText: 'Server Error' });
    expect(component.estado()).toBe('error');
  });

  it('pasa a "listo" con los productos que entrega el backend', () => {
    cargaInicial.flush({
      ultimaActualizacion: { jumbo: null, santa_isabel: null },
      comunes: [
        {
          slug: 'arroz-1kg',
          nombre: 'Arroz 1 kg',
          unidad: 'kg',
          cantidad: 1,
          tiendas: {
            jumbo: { precio: 2000, desactualizado: false },
            santa_isabel: { precio: 1500, desactualizado: false },
          },
        },
      ],
    });
    expect(component.estado()).toBe('listo');
    expect(component.productos()).toHaveLength(1);
    expect(component.ganadora()).toBe('Santa Isabel');
  });

  describe('con una lista de compras', () => {
    const item = (id: string, nombre: string, comprado: boolean, jumbo: number | null, santa: number | null) => ({
      id,
      nombre,
      cantidad: 1,
      unidad: 'kg',
      categoria: 'despensa',
      comprado,
      nombresOriginales: [nombre],
      reglas: [],
      costo: {
        tiendas: {
          jumbo: jumbo === null ? null : { total: jumbo },
          santa_isabel: santa === null ? null : { total: santa },
        },
      },
    });

    it('arma la boleta solo con lo que falta comprar y avisa lo que no tiene precio', async () => {
      const carga = TestBed.inject(ListaComprasService).cargar();
      http.expectOne((req) => req.url.endsWith('/shopping-lists')).flush({
        id: 'l1',
        semana: '2026-11-23',
        items: [
          item('i1', 'arroz', false, 3000, 2400),
          item('i2', 'aceite', false, 2000, 2500),
          item('i3', 'sal', true, 500, 400),
          item('i4', 'cilantro', false, null, null),
        ],
        resumen: { itemsTotal: 4, itemsComparables: 3, itemsSinPrecio: 1, comparable: null },
      });
      await carga;

      expect(component.hayLista()).toBe(true);
      // "sal" ya está marcada (la tienes) y "cilantro" no tiene precio: solo entran arroz y aceite.
      expect(component.filas().map((fila) => fila.slug)).toEqual(['i1', 'i2']);
      expect(component.totales()).toEqual([5000, 4900]);
      expect(component.ganadora()).toBe('Santa Isabel');
      expect(component.tiendaMasBarata().ahorro).toBe(100);
      expect(component.sinPrecio()).toEqual(['Cilantro']);
    });
  });

  // Regresión: masBaratoNombre() usaba `precios[0] < precios[1] ? 0 : 1`,
  // que con precios iguales elegía la tienda del índice 1 (Santa Isabel)
  // aunque esMasBarato() marcara las DOS celdas como "más baratas" en la
  // tabla: un sello contradictorio con la tabla que lo acompaña.
  describe('empate de precios', () => {
    const productoEmpatado: PrecioProducto = {
      producto: 'Producto empatado',
      cantidad: '1 unid.',
      precios: [1000, 1000],
    };

    it('esMasBarato() marca las dos tiendas como más baratas', () => {
      expect(component.esMasBarato(productoEmpatado, 0)).toBe(true);
      expect(component.esMasBarato(productoEmpatado, 1)).toBe(true);
    });

    it('masBaratoNombre() no elige ninguna tienda: dice "Empate"', () => {
      expect(component.masBaratoNombre(productoEmpatado)).toBe('Empate');
    });

    it('diferencia() da 0 cuando los precios son iguales', () => {
      expect(component.diferencia(productoEmpatado)).toBe(0);
    });
  });

  describe('sin empate', () => {
    const productoJumboMasBarato: PrecioProducto = {
      producto: 'Producto sin empate',
      cantidad: '1 unid.',
      precios: [900, 1200],
    };

    it('masBaratoNombre() elige la tienda con el precio más bajo', () => {
      expect(component.masBaratoNombre(productoJumboMasBarato)).toBe(component.tiendas[0]);
    });

    it('esMasBarato() coincide con masBaratoNombre() (no hay contradicción)', () => {
      expect(component.esMasBarato(productoJumboMasBarato, 0)).toBe(true);
      expect(component.esMasBarato(productoJumboMasBarato, 1)).toBe(false);
    });
  });
});
