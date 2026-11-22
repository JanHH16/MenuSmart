import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Estado de conectividad del dispositivo, expuesto como signals.
 *
 * Se apoya en `navigator.onLine` y en los eventos `online` / `offline` de
 * `window`. Como la app no usa zone.js, el cambio de estado se notifica solo
 * a través de signals: las plantillas que lean `enLinea()` o `sinConexion()`
 * se actualizan sin necesidad de `detectChanges` manual.
 *
 * Limitación conocida: `navigator.onLine` solo sabe si el dispositivo tiene
 * una interfaz de red activa, no si hay salida real a internet (por ejemplo
 * un wifi sin acceso). Por eso sirve para avisar al usuario, pero cada
 * llamada HTTP debe seguir manejando sus propios errores.
 */
@Injectable({ providedIn: 'root' })
export class ConectividadService {
  private readonly ventana = inject(DOCUMENT).defaultView;

  private readonly _enLinea = signal(this.leerEstado());

  /** `true` mientras el navegador reporta que hay red. */
  readonly enLinea = this._enLinea.asReadonly();

  /** Inverso de `enLinea`, para plantillas que muestran avisos de falta de red. */
  readonly sinConexion = computed(() => !this._enLinea());

  constructor() {
    if (!this.ventana) {
      return;
    }
    const ventana = this.ventana;
    const alConectar = () => this._enLinea.set(true);
    const alDesconectar = () => this._enLinea.set(false);

    ventana.addEventListener('online', alConectar);
    ventana.addEventListener('offline', alDesconectar);

    inject(DestroyRef).onDestroy(() => {
      ventana.removeEventListener('online', alConectar);
      ventana.removeEventListener('offline', alDesconectar);
    });
  }

  private leerEstado(): boolean {
    // Sin `navigator` (render en servidor o tests sin DOM) se asume conectado.
    return this.ventana?.navigator?.onLine ?? true;
  }
}
