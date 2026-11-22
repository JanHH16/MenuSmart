import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { SharedModule } from '../../../shared/shared.module';
import { SugerenciasPageRoutingModule } from './sugerencias-routing.module';

import { SugerenciasPage } from './sugerencias.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    SugerenciasPageRoutingModule
  ],
  declarations: [SugerenciasPage]
})
export class SugerenciasPageModule {}
