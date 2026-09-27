import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
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

  irAComparador(): void {
    this.router.navigateByUrl('/tabs/comparador');
  }
}
