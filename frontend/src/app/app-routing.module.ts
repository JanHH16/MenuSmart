import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    // Splash (Figma "0a/0b"): solo se muestra al abrir la app en la raíz
    // exacta ('' con pathMatch:'full'), nunca al navegar directo a una URL
    // más profunda (login, tabs/*, etc.) — por eso va ANTES y con
    // pathMatch:'full', mientras la entrada de tabs de abajo (prefix match)
    // sigue resolviendo esas URLs igual que antes.
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./pages/splash/splash.module').then((m) => m.SplashPageModule),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./tabs/tabs.module').then((m) => m.TabsPageModule),
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'register',
    loadChildren: () =>
      import('./pages/register/register.module').then((m) => m.RegisterPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
