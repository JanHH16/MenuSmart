import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import {
  AgregarIngredienteModalComponent,
  IngredienteFormValue,
} from '../../../shared/agregar-ingrediente-modal/agregar-ingrediente-modal.component';
import { PhotoService } from '../../../core/services/photo.service';
import { Comida, PlanSemanalService } from '../../../core/services/plan-semanal.service';

@Component({
  selector: 'app-detalle-comida',
  templateUrl: './detalle-comida.page.html',
  styleUrls: ['./detalle-comida.page.scss'],
  standalone: false,
})
export class DetalleComidaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalCtrl = inject(ModalController);
  private readonly photoService = inject(PhotoService);
  private readonly planSemanalService = inject(PlanSemanalService);
  private readonly cdr = inject(ChangeDetectorRef);

  comida?: Comida;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.comida = id ? this.planSemanalService.getComida(id) : undefined;
  }

  async cambiarFoto(): Promise<void> {
    const foto = await this.photoService.elegirFoto();
    if (foto && this.comida) {
      this.comida.foto = foto;
    }
    // Este proyecto corre sin zone.js (angular.json: "polyfills": []), así
    // que Angular no se entera solo de que una promesa ajena a un evento de
    // plantilla (action sheet / cámara / explorador de archivos) cambió el
    // estado del componente; hay que pedirle explícitamente que revise la vista.
    this.cdr.detectChanges();
  }

  async agregarIngrediente(): Promise<void> {
    if (!this.comida) {
      return;
    }
    const modal = await this.modalCtrl.create({
      component: AgregarIngredienteModalComponent,
      cssClass: 'ms-modal-card',
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<IngredienteFormValue>();
    if (role === 'confirm' && data) {
      this.planSemanalService.agregarIngrediente(this.comida.id, data);
    }
    this.cdr.detectChanges();
  }

  eliminarIngrediente(ingredienteId: string): void {
    if (!this.comida) {
      return;
    }
    this.planSemanalService.eliminarIngrediente(this.comida.id, ingredienteId);
  }

  volver(): void {
    this.router.navigateByUrl('/tabs/plan-semanal');
  }

  guardar(): void {
    // TODO: persistir cambios cuando exista el endpoint real de comidas.
    this.volver();
  }
}
