import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
import { ListaComprasService } from '../../core/services/lista-compras.service';
import { PlanSemanalService } from '../../core/services/plan-semanal.service';

interface PerfilOpcion {
  label: string;
  icon: string;
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements OnInit {
  private readonly layoutService = inject(LayoutService);
  private readonly planSemanalService = inject(PlanSemanalService);
  private readonly listaComprasService = inject(ListaComprasService);

  readonly esDesktop$ = this.layoutService.esDesktop$;

  private readonly authService = inject(AuthService);

  // El correo sale del token; el nombre se muestra a partir de él hasta que el perfil se lea
  // de GET /api/users/me.
  readonly email = this.authService.getEmail() ?? '';
  readonly nombre = this.email ? this.email.split('@')[0] : 'Tu cuenta';
  readonly iniciales = this.nombre.slice(0, 2).toUpperCase();

  // Cifras reales de la semana que se está viendo.
  readonly comidasPlaneadas = this.planSemanalService.totalComidas;
  readonly ahorroEstimado = computed(() => {
    const ahorro = this.listaComprasService.resumen()?.ahorro ?? 0;
    return ahorro > 0 ? `$${ahorro.toLocaleString('es-CL')}` : '-';
  });
  readonly preferenciasDesktop = ['Preferencias alimentarias', 'Supermercados favoritos', 'Presupuesto semanal'];

  readonly opciones: PerfilOpcion[] = [
    { label: 'Preferencias alimentarias', icon: 'restaurant-outline' },
    { label: 'Supermercados favoritos', icon: 'storefront-outline' },
    { label: 'Notificaciones', icon: 'notifications-outline' },
  ];

  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  ngOnInit(): void {
    void this.planSemanalService.cargar();
    void this.listaComprasService.cargar();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  // Preferencias alimentarias / Supermercados favoritos / Notificaciones:
  // ya vienen marcadas como "Pronto" en el diseño de Figma (no tienen
  // pantalla propia todavía), así que solo confirmamos la interacción.
  async proximamente(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: 'Función disponible próximamente',
      duration: 2000,
      position: 'bottom',
      cssClass: 'ms-toast',
    });
    await toast.present();
  }
}
