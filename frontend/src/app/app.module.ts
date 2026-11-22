import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';
import { Capacitor } from '@capacitor/core';

import { IonicModule, IonicRouteStrategy, ModalController } from '@ionic/angular/lazy';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    // Service worker de la PWA (ver ngsw-config.json). Solo en producción: en
    // desarrollo cachearía los bundles y ocultaría los cambios. Tampoco se
    // registra dentro de la app nativa (Capacitor): ahí los archivos ya viajan
    // empaquetados en el APK y el service worker solo agregaría una capa más.
    // Se registra cuando la app queda estable o a los 30 s, lo que ocurra
    // primero, para no competir con la carga inicial.
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode() && !Capacitor.isNativePlatform(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
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
