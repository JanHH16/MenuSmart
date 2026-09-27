import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../core/services/auth.service';

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
export class PerfilPage {
  // TODO: reemplazar por datos reales cuando exista un endpoint de perfil
  // en el backend (GET /api/users/me). Por ahora es solo la vista.
  readonly semanasPlaneadas = 12;

  readonly opciones: PerfilOpcion[] = [
    { label: 'Preferencias alimentarias', icon: 'restaurant-outline' },
    { label: 'Supermercados favoritos', icon: 'storefront-outline' },
    { label: 'Notificaciones', icon: 'notifications-outline' },
  ];

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

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
