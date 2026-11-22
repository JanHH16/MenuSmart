import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';
import { ListaComprasService } from '../../core/services/lista-compras.service';
import { PlanSemanalService } from '../../core/services/plan-semanal.service';

@Component({
  selector: 'app-lista-compras',
  templateUrl: './lista-compras.page.html',
  styleUrls: ['./lista-compras.page.scss'],
  standalone: false,
})
export class ListaComprasPage implements OnInit {
  private readonly listaComprasService = inject(ListaComprasService);
  private readonly planSemanalService = inject(PlanSemanalService);
  private readonly router = inject(Router);
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;
  // Inclinación de cada tarjeta de categoría en desktop (Figma: rots).
  readonly rotaciones = [-1.2, 0.8, -0.6, 1.1];

  readonly categorias = this.listaComprasService.categorias;
  readonly estado = this.listaComprasService.estado;
  readonly generando = this.listaComprasService.generando;
  readonly mensaje = this.listaComprasService.mensaje;
  readonly resumen = this.listaComprasService.resumen;
  readonly totalItems = this.listaComprasService.totalItems;
  readonly itemsComprados = this.listaComprasService.itemsComprados;
  readonly totalComidas = this.listaComprasService.totalComidas;

  readonly progresoPorcentaje = computed(() =>
    this.totalItems() === 0 ? 0 : Math.round((this.itemsComprados() / this.totalItems()) * 100),
  );

  ngOnInit(): void {
    // El plan se carga para poder decir "generada desde N comidas".
    void this.planSemanalService.cargar();
    void this.listaComprasService.cargar();
  }

  generar(): void {
    void this.listaComprasService.generar();
  }

  reintentar(): void {
    void this.listaComprasService.cargar();
  }

  alternar(itemId: string): void {
    void this.listaComprasService.alternarComprado(itemId);
  }

  formatPrecio(valor: number): string {
    return `$${valor.toLocaleString('es-CL')}`;
  }

  irAComparador(): void {
    this.router.navigateByUrl('/tabs/comparador');
  }

  irAlPlan(): void {
    this.router.navigateByUrl('/tabs/plan-semanal');
  }
}
