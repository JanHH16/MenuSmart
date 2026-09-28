import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Intro (Figma: "0a. Splash" / "0b. Splash (logo)"): el ícono aparece solo
 * y, al poco, "rebota" hacia arriba mientras aparece el nombre + tagline
 * debajo — luego se desvanece hacia adentro de la app. Es una animación de
 * una sola vez al abrir la app, no una pantalla con la que se interactúe.
 */
@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false,
})
export class SplashPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  stage = 0;

  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  ngOnInit(): void {
    // Este proyecto corre sin zone.js (angular.json: "polyfills": []), así
    // que un setTimeout normal no dispara detección de cambios por sí solo:
    // sin el detectChanges() explícito, `stage` cambia en memoria pero la
    // vista se queda congelada en stage 0 hasta la navegación.
    this.timers.push(
      setTimeout(() => {
        this.stage = 1;
        this.cdr.detectChanges();
      }, 600),
      setTimeout(() => {
        this.router.navigateByUrl('/tabs');
      }, 2000),
    );
  }

  ngOnDestroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
  }
}
