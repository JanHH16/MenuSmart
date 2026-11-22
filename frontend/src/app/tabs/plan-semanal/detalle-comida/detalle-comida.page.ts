import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import {
  AgregarIngredienteModalComponent,
  IngredienteFormValue,
} from '../../../shared/agregar-ingrediente-modal/agregar-ingrediente-modal.component';
import { PhotoService } from '../../../core/services/photo.service';
import { LayoutService } from '../../../core/services/layout.service';
import { Comida, PlanSemanalService, TIPOS_COMIDA } from '../../../core/services/plan-semanal.service';

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
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;
  readonly dias = this.planSemanalService.getDiasSemana();
  readonly tipos = TIPOS_COMIDA;

  comida?: Comida;

  cargando = true;
  error = '';

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.comida = id ? await this.planSemanalService.obtenerComida(id) : undefined;
    this.cargando = false;
    this.cdr.detectChanges();
  }

  async cambiarFoto(): Promise<void> {
    const foto = await this.photoService.elegirFoto();
    if (foto && this.comida) {
      this.comida.foto = foto;
      this.planSemanalService.setFoto(this.comida.id, foto);
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
      const comida = this.comida;
      await this.ejecutar(async () => {
        this.comida = await this.planSemanalService.agregarIngrediente(comida, data);
      }, 'No se pudo agregar el ingrediente.');
    }
    this.cdr.detectChanges();
  }

  async eliminarIngrediente(ingredienteId: string): Promise<void> {
    if (!this.comida) {
      return;
    }
    const comida = this.comida;
    await this.ejecutar(async () => {
      this.comida = await this.planSemanalService.eliminarIngrediente(comida, ingredienteId);
    }, 'No se pudo quitar el ingrediente.');
    this.cdr.detectChanges();
  }

  volver(): void {
    this.router.navigateByUrl('/tabs/plan-semanal');
  }

  async guardar(): Promise<void> {
    if (!this.comida) {
      return;
    }
    const { id, nombre, tipo, dia, notas } = this.comida;
    await this.ejecutar(async () => {
      await this.planSemanalService.guardarCambios(id, { nombre, tipo, dia, notas: notas ?? '' });
      this.volver();
    }, 'No se pudieron guardar los cambios.');
    this.cdr.detectChanges();
  }

  /** Corre una acción contra el servidor y deja el mensaje de error visible si falla. */
  private async ejecutar(accion: () => Promise<void>, mensajeError: string): Promise<void> {
    this.error = '';
    try {
      await accion();
    } catch {
      this.error = mensajeError;
    }
  }
}
