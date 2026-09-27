import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { AgregarIngredienteModalComponent } from './agregar-ingrediente-modal/agregar-ingrediente-modal.component';

/**
 * Componentes reutilizables entre módulos de features (páginas creadas
 * con Ionic CLI generan un NgModule por página; los que se abren de forma
 * imperativa, como los modales, viven acá para no duplicarlos).
 */
@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [AgregarIngredienteModalComponent],
  exports: [AgregarIngredienteModalComponent],
})
export class SharedModule {}
