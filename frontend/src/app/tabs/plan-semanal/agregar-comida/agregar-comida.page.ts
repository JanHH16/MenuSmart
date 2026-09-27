import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/lazy';
import {
  AgregarIngredienteModalComponent,
  IngredienteFormValue,
} from '../../../shared/agregar-ingrediente-modal/agregar-ingrediente-modal.component';
import { PhotoService } from '../../../core/services/photo.service';
import { ComidaGuardada, PlanSemanalService, TIPOS_COMIDA } from '../../../core/services/plan-semanal.service';

@Component({
  selector: 'app-agregar-comida',
  templateUrl: './agregar-comida.page.html',
  styleUrls: ['./agregar-comida.page.scss'],
  standalone: false,
})
export class AgregarComidaPage {
  private readonly router = inject(Router);
  private readonly modalCtrl = inject(ModalController);
  private readonly photoService = inject(PhotoService);
  private readonly planSemanalService = inject(PlanSemanalService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly dias = this.planSemanalService.getDiasSemana();
  readonly tipos = TIPOS_COMIDA;

  // "nueva": tipear una comida desde cero. "guardadas": reutilizar una
  // comida ya creada antes (ej. "Pollo al horno" del martes) en otro día.
  modo: 'nueva' | 'guardadas' = 'nueva';

  nombre = '';
  diaSeleccionado = this.dias[4]?.nombre ?? this.dias[0].nombre; // Viernes por defecto, igual que el mock de Figma
  tipoSeleccionado = 'Almuerzo';
  foto?: string;
  notas = '';

  // Los ingredientes se acumulan localmente: la comida recién se crea (con
  // id real) al presionar "Guardar comida".
  ingredientes: IngredienteFormValue[] = [];

  readonly comidasGuardadas = this.planSemanalService.getComidasGuardadas();
  busqueda = '';

  get puedeGuardar(): boolean {
    return this.nombre.trim().length > 0;
  }

  get comidasGuardadasFiltradas(): ComidaGuardada[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) {
      return this.comidasGuardadas;
    }
    return this.comidasGuardadas.filter((comida) => comida.nombre.toLowerCase().includes(q));
  }

  async elegirFoto(): Promise<void> {
    const foto = await this.photoService.elegirFoto();
    if (foto) {
      this.foto = foto;
    }
    // Este proyecto corre sin zone.js (angular.json: "polyfills": []), así
    // que Angular no se entera solo de que una promesa ajena a un evento de
    // plantilla (action sheet / cámara / explorador de archivos) cambió el
    // estado del componente; hay que pedirle explícitamente que revise la vista.
    this.cdr.detectChanges();
  }

  async agregarIngrediente(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AgregarIngredienteModalComponent,
      cssClass: 'ms-modal-card',
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<IngredienteFormValue>();
    if (role === 'confirm' && data) {
      this.ingredientes.push(data);
    }
    this.cdr.detectChanges();
  }

  eliminarIngrediente(index: number): void {
    this.ingredientes.splice(index, 1);
  }

  guardar(): void {
    if (!this.puedeGuardar) {
      return;
    }
    const comida = this.planSemanalService.crearComida({
      nombre: this.nombre.trim(),
      dia: this.diaSeleccionado,
      tipo: this.tipoSeleccionado,
      foto: this.foto,
      notas: this.notas.trim() || undefined,
    });
    for (const ingrediente of this.ingredientes) {
      this.planSemanalService.agregarIngrediente(comida.id, ingrediente);
    }
    this.volver();
  }

  nombresIngredientes(guardada: ComidaGuardada): string {
    return guardada.ingredientes.map((ingrediente) => ingrediente.nombre).join(', ');
  }

  usarComidaGuardada(guardada: ComidaGuardada): void {
    this.planSemanalService.reutilizarComida(guardada, this.diaSeleccionado, this.tipoSeleccionado);
    this.volver();
  }

  volver(): void {
    this.router.navigateByUrl('/tabs/plan-semanal');
  }
}
