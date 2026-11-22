import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PlanSemanalPage } from './plan-semanal.page';

const routes: Routes = [
  {
    path: '',
    component: PlanSemanalPage
  },
  {
    path: 'comida/:id',
    loadChildren: () =>
      import('./detalle-comida/detalle-comida.module').then((m) => m.DetalleComidaPageModule),
  },
  {
    path: 'nueva',
    loadChildren: () =>
      import('./agregar-comida/agregar-comida.module').then((m) => m.AgregarComidaPageModule),
  },
  {
    path: 'sugerencias',
    loadChildren: () =>
      import('./sugerencias/sugerencias.module').then((m) => m.SugerenciasPageModule),
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanSemanalPageRoutingModule {}
