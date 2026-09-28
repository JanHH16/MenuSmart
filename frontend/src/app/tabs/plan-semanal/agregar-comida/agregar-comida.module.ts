import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { SharedModule } from '../../../shared/shared.module';
import { AgregarComidaPageRoutingModule } from './agregar-comida-routing.module';

import { AgregarComidaPage } from './agregar-comida.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    AgregarComidaPageRoutingModule
  ],
  declarations: [AgregarComidaPage]
})
export class AgregarComidaPageModule {}
