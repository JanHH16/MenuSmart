import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgregarComidaPage } from './agregar-comida.page';

const routes: Routes = [
  {
    path: '',
    component: AgregarComidaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgregarComidaPageRoutingModule {}
