import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { PlanSemanalPageRoutingModule } from './plan-semanal-routing.module';

import { PlanSemanalPage } from './plan-semanal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PlanSemanalPageRoutingModule
  ],
  declarations: [PlanSemanalPage]
})
export class PlanSemanalPageModule {}
