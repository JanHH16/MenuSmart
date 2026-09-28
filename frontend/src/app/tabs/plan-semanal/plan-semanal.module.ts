import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { SharedModule } from '../../shared/shared.module';
import { PlanSemanalPageRoutingModule } from './plan-semanal-routing.module';

import { PlanSemanalPage } from './plan-semanal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    PlanSemanalPageRoutingModule
  ],
  declarations: [PlanSemanalPage]
})
export class PlanSemanalPageModule {}
