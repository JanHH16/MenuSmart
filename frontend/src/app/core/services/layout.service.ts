import { Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs/operators';

/**
 * Punto de corte único para elegir estructura "mobile" vs "desktop".
 *
 * Esto NO es un breakpoint más de una escala responsiva (no reacomoda
 * columnas de forma fluida): por debajo del corte cada página renderiza su
 * árbol de componentes mobile (tabs abajo, tarjetas apiladas) y por encima
 * su árbol desktop (sidebar fija, contenido en columnas) — son dos
 * estructuras HTML distintas, elegidas con *ngIf según este observable, no
 * el mismo markup estirado con CSS.
 *
 * Regla de tablet (para no diseñar un tercer layout en Figma): se resuelve
 * por ANCHO, no por "es tablet". Una tablet en vertical (~768–834px, ej.
 * iPad) cae bajo los 1024px y usa el layout mobile; la misma tablet en
 * horizontal (~1024–1366px) supera el corte y usa el layout desktop. Así
 * "tablet vertical → mobile, tablet horizontal → desktop" sale gratis del
 * mismo breakpoint de ancho, sin mantener un layout aparte para tablet
 * (práctica estándar: Material Design / Apple HIG resuelven tablet
 * reutilizando el layout de la orientación más cercana).
 */
export const DESKTOP_BREAKPOINT = '(min-width: 1024px)';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly esDesktop$ = this.breakpointObserver.observe(DESKTOP_BREAKPOINT).pipe(
    map((state) => state.matches),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor(private readonly breakpointObserver: BreakpointObserver) {}
}
