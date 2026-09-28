import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { SharedModule } from '../../../shared/shared.module';
import { DetalleComidaPageRoutingModule } from './detalle-comida-routing.module';

import { DetalleComidaPage } from './detalle-comida.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    DetalleComidaPageRoutingModule
  ],
  declarations: [DetalleComidaPage]
})
export class DetalleComidaPageModule {}
