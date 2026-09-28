import { Component, inject } from '@angular/core';
import { LayoutService } from '../../core/services/layout.service';
import { ComparadorService, PrecioProducto } from '../../core/services/comparador.service';

@Component({
  selector: 'app-comparador',
  templateUrl: './comparador.page.html',
  styleUrls: ['./comparador.page.scss'],
  standalone: false,
})
export class ComparadorPage {
  private readonly comparadorService = inject(ComparadorService);
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;
  readonly tiendas = this.comparadorService.tiendas;
  readonly productos: PrecioProducto[] = this.comparadorService.getProductos();
  readonly totales = this.comparadorService.getTotales();
  readonly tiendaMasBarata = this.comparadorService.getTiendaMasBarata();

  esMasBarato(producto: PrecioProducto, indiceTienda: number): boolean {
    return producto.precios[indiceTienda] === Math.min(...producto.precios);
  }

  formatPrecio(valor: number): string {
    return `$${valor.toLocaleString('es-CL')}`;
  }

  // Diferencia / "más barato" asumen exactamente 2 tiendas, como el diseño
  // de Figma ("Jumbo vs. Santa Isabel").
  diferencia(producto: PrecioProducto): number {
    return Math.abs(producto.precios[0] - producto.precios[1]);
  }

  // Misma regla que esMasBarato() (Math.min), en vez de comparar
  // precios[0] < precios[1] por separado: antes, con precios iguales,
  // esMasBarato() marcaba las DOS celdas como "más baratas" pero este método
  // igual elegía Santa Isabel (el índice 1 gana empates en "< "), mostrando
  // un sello contradictorio con la tabla.
  masBaratoNombre(producto: PrecioProducto): string {
    const indice = this.indiceMasBarato(producto);
    if (indice === null) {
      return 'Empate';
    }
    return this.abreviar(this.tiendas[indice]);
  }

  private indiceMasBarato(producto: PrecioProducto): number | null {
    const minimo = Math.min(...producto.precios);
    const indices = producto.precios.reduce<number[]>((acc, precio, i) => {
      if (precio === minimo) {
        acc.push(i);
      }
      return acc;
    }, []);
    return indices.length === 1 ? indices[0] : null;
  }

  // En los timbres chicos Figma escribe "S. Isabel".
  abreviar(tienda: string): string {
    return tienda === 'Santa Isabel' ? 'S. Isabel' : tienda;
  }

  barraAncho(total: number): number {
    const max = Math.max(...this.totales);
    return max === 0 ? 0 : Math.round((total / max) * 100);
  }

  // Figma: nota "ojo: …" con el producto que conviene comprar en la OTRA
  // tienda (la que no gana en el total), el de mayor diferencia. Si no hay
  // ninguno, no se muestra la nota.
  readonly consejo = this.calcularConsejo();

  // Código de barras decorativo del pie de la boleta (Figma: barcode()).
  readonly barras = this.calcularBarras(220);

  private calcularConsejo(): { producto: string; ahorro: number; tienda: string } | null {
    const ganadora = this.tiendaMasBarata.indice;
    let mejor: { producto: string; ahorro: number; tienda: string } | null = null;
    for (const producto of this.productos) {
      const barata = this.indiceMasBarato(producto);
      const ahorro = this.diferencia(producto);
      if (barata !== null && barata !== ganadora && (!mejor || ahorro > mejor.ahorro)) {
        mejor = { producto: producto.producto.toLowerCase(), ahorro, tienda: this.tiendas[barata] };
      }
    }
    return mejor;
  }

  private calcularBarras(ancho: number): { x: number; w: number }[] {
    const patron = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 3, 2, 1, 2];
    const barras: { x: number; w: number }[] = [];
    for (let x = 0, i = 0; x < ancho; i++) {
      const w = patron[i % patron.length];
      if (i % 2 === 0) {
        barras.push({ x, w });
      }
      x += w + 1.5;
    }
    return barras;
  }
}
