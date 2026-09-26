import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PlanSemanalPage } from './plan-semanal.page';

const routes: Routes = [
  {
    path: '',
    component: PlanSemanalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanSemanalPageRoutingModule {}
