import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

type SidebarIcono = 'plan' | 'list' | 'receipt' | 'user';

interface SidebarItem {
  label: string;
  icono: SidebarIcono;
  href: string;
}

/**
 * Menú lateral fijo para el layout desktop (Figma: helper `sidebar()`,
 * dibujado en cada pantalla "D*"). En Angular vive una sola vez en
 * TabsPage — persiste entre las 4 rutas de tabs igual que el
 * ion-tab-bar mobile — en vez de repetirse por página.
 */
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false,
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  // Se muestra a partir del correo del token, igual que en el perfil.
  readonly nombre = this.authService.getEmail()?.split('@')[0] ?? 'Tu cuenta';
  readonly iniciales = this.nombre.slice(0, 2).toUpperCase();

  readonly items: SidebarItem[] = [
    { label: 'Plan semanal', icono: 'plan', href: '/tabs/plan-semanal' },
    { label: 'Lista de compras', icono: 'list', href: '/tabs/lista-compras' },
    { label: 'Comparador', icono: 'receipt', href: '/tabs/comparador' },
    { label: 'Perfil', icono: 'user', href: '/tabs/perfil' },
  ];
}
