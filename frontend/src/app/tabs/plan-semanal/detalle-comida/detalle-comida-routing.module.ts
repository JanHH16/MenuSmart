import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetalleComidaPage } from './detalle-comida.page';

const routes: Routes = [
  {
    path: '',
    component: DetalleComidaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetalleComidaPageRoutingModule {}
