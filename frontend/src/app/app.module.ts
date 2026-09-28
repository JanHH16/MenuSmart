import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy, ModalController } from '@ionic/angular/lazy';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, IonicModule.forRoot(), AppRoutingModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    // IonicModule.forRoot() ya debería proveer ModalController, pero los
    // módulos lazy-loaded (páginas con loadChildren) no siempre heredan los
    // providers internos de un NgModule reimportado como IonicModule en su
    // propio injector (queda aislado por el router). Se declara explícito
    // acá para garantizar que ModalController.create() funcione desde
    // cualquier página lazy (Agregar comida, Detalle de comida, etc.).
    ModalController,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
