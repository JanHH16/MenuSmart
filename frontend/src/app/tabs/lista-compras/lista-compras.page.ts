import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';
import { CategoriaCompra, ListaComprasService } from '../../core/services/lista-compras.service';

@Component({
  selector: 'app-lista-compras',
  templateUrl: './lista-compras.page.html',
  styleUrls: ['./lista-compras.page.scss'],
  standalone: false,
})
export class ListaComprasPage {
  private readonly listaComprasService = inject(ListaComprasService);
  private readonly router = inject(Router);
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;
  // Inclinación de cada tarjeta de categoría en desktop (Figma: rots).
  readonly rotaciones = [-1.2, 0.8, -0.6, 1.1];
  readonly categorias: CategoriaCompra[] = this.listaComprasService.getLista();

  get totalItems(): number {
    return this.listaComprasService.totalItems();
  }

  get itemsComprados(): number {
    return this.listaComprasService.itemsComprados();
  }

  get totalComidas(): number {
    return this.listaComprasService.getTotalComidas();
  }

  get progresoPorcentaje(): number {
    return this.totalItems === 0 ? 0 : Math.round((this.itemsComprados / this.totalItems) * 100);
  }

  irAComparador(): void {
    this.router.navigateByUrl('/tabs/comparador');
  }
}