import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';
import { PlanSemanalService } from '../../core/services/plan-semanal.service';

@Component({
  selector: 'app-plan-semanal',
  templateUrl: './plan-semanal.page.html',
  styleUrls: ['./plan-semanal.page.scss'],
  standalone: false,
})
export class PlanSemanalPage implements OnInit {
  private readonly planSemanalService = inject(PlanSemanalService);
  private readonly router = inject(Router);
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;
  readonly semana = this.planSemanalService.semana;
  readonly rangoSemana = this.planSemanalService.rangoSemana;
  readonly estado = this.planSemanalService.estado;

  ngOnInit(): void {
    void this.planSemanalService.cargar();
  }

  cambiarSemana(semanas: number): void {
    void this.planSemanalService.cambiarSemana(semanas);
  }

  reintentar(): void {
    void this.planSemanalService.cargar();
  }

  abrirComida(comidaId: string): void {
    this.router.navigateByUrl(`/tabs/plan-semanal/comida/${comidaId}`);
  }

  agregarComida(): void {
    this.router.navigateByUrl('/tabs/plan-semanal/nueva');
  }
}