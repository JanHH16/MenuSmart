import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'plan-semanal',
        loadChildren: () =>
          import('./plan-semanal/plan-semanal.module').then((m) => m.PlanSemanalPageModule),
      },
      {
        path: 'lista-compras',
        loadChildren: () =>
          import('./lista-compras/lista-compras.module').then((m) => m.ListaComprasPageModule),
      },
      {
        path: 'comparador',
        loadChildren: () =>
          import('./comparador/comparador.module').then((m) => m.ComparadorPageModule),
      },
      {
        path: 'perfil',
        loadChildren: () => import('./perfil/perfil.module').then((m) => m.PerfilPageModule),
      },
      {
        path: '',
        redirectTo: '/tabs/plan-semanal',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/plan-semanal',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
