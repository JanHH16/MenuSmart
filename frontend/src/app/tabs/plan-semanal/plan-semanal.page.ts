import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';
import { DiaPlan, PlanSemanalService } from '../../core/services/plan-semanal.service';

@Component({
  selector: 'app-plan-semanal',
  templateUrl: './plan-semanal.page.html',
  styleUrls: ['./plan-semanal.page.scss'],
  standalone: false,
})
export class PlanSemanalPage {
  private readonly planSemanalService = inject(PlanSemanalService);
  private readonly router = inject(Router);
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;
  readonly semana: DiaPlan[] = this.planSemanalService.getSemana();
  readonly rangoSemana = `${this.semana[0].numero} — ${this.semana[this.semana.length - 1].numero} sep`;

  abrirComida(comidaId: string): void {
    this.router.navigateByUrl(`/tabs/plan-semanal/comida/${comidaId}`);
  }

  agregarComida(): void {
    this.router.navigateByUrl('/tabs/plan-semanal/nueva');
  }
}