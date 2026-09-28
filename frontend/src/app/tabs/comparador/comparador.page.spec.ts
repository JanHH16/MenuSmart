import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComparadorPage } from './comparador.page';
import { PrecioProducto } from '../../core/services/comparador.service';

describe('ComparadorPage', () => {
  let component: ComparadorPage;
  let fixture: ComponentFixture<ComparadorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ComparadorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regresión: masBaratoNombre() usaba `precios[0] < precios[1] ? 0 : 1`,
  // que con precios iguales elegía la tienda del índice 1 (Santa Isabel)
  // aunque esMasBarato() marcara las DOS celdas como "más baratas" en la
  // tabla — un sello contradictorio con la tabla que lo acompaña.
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
