import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ComparadorPage } from './comparador.page';

const routes: Routes = [
  {
    path: '',
    component: ComparadorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComparadorPageRoutingModule {}
