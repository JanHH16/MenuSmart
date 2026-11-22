import { Component, inject } from '@angular/core';

import { ConectividadService } from './core/services/conectividad.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  protected readonly conectividad = inject(ConectividadService);
}
