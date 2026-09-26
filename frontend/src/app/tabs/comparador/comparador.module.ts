import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { ComparadorPageRoutingModule } from './comparador-routing.module';

import { ComparadorPage } from './comparador.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ComparadorPageRoutingModule
  ],
  declarations: [ComparadorPage]
})
export class ComparadorPageModule {}
