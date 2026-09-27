import { Component, inject } from '@angular/core';
import { ComparadorService, PrecioProducto } from '../../core/services/comparador.service';

@Component({
  selector: 'app-comparador',
  templateUrl: './comparador.page.html',
  styleUrls: ['./comparador.page.scss'],
  standalone: false,
})
export class ComparadorPage {
  private readonly comparadorService = inject(ComparadorService);

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
}
