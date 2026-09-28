import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/lazy';

export interface IngredienteFormValue {
  nombre: string;
  cantidad: string;
}

/**
 * Modal "Agregar ingrediente" (ver Figma, pantalla 9). Vive en SharedModule
 * para poder abrirlo por código (ModalController.create) tanto desde
 * Detalle de comida como desde Agregar comida sin duplicarlo.
 */
@Component({
  selector: 'app-agregar-ingrediente-modal',
  templateUrl: './agregar-ingrediente-modal.component.html',
  styleUrls: ['./agregar-ingrediente-modal.component.scss'],
  standalone: false,
})
export class AgregarIngredienteModalComponent {
  private readonly modalCtrl = inject(ModalController);

  nombre = '';
  cantidad = '';

  get esValido(): boolean {
    return this.nombre.trim().length > 0 && this.cantidad.trim().length > 0;
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  agregar(): void {
    if (!this.esValido) {
      return;
    }
    const valor: IngredienteFormValue = { nombre: this.nombre.trim(), cantidad: this.cantidad.trim() };
    this.modalCtrl.dismiss(valor, 'confirm');
  }
}
