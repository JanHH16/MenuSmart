import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { PlanSemanalService } from '../../../core/services/plan-semanal.service';
import {
  FiltroTipo,
  INGREDIENTES_CATALOGO,
  RecomendacionesService,
  Sugerencia,
  etiquetaDeIngrediente,
} from '../../../core/services/recomendaciones.service';
import { formatearCantidad } from '../../../core/utils/cantidad';

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

@Component({
  selector: 'app-sugerencias',
  templateUrl: './sugerencias.page.html',
  styleUrls: ['./sugerencias.page.scss'],
  standalone: false,
})
export class SugerenciasPage implements OnInit {
  private readonly recomendaciones = inject(RecomendacionesService);
  private readonly planSemanal = inject(PlanSemanalService);
  private readonly router = inject(Router);
  private readonly layoutService = inject(LayoutService);
  private readonly injector = inject(Injector);
  private readonly raiz = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly esDesktop$ = this.layoutService.esDesktop$;

  readonly sugerencias = this.recomendaciones.sugerencias;
  readonly resumen = this.recomendaciones.resumen;
  readonly estado = this.recomendaciones.estado;
  readonly errorCarga = this.recomendaciones.errorCarga;
  readonly mensaje = this.recomendaciones.mensaje;
  readonly ocupada = this.recomendaciones.ocupada;
  readonly pesoCosto = this.recomendaciones.pesoCosto;
  readonly excluidos = this.recomendaciones.excluidos;
  readonly adaptativo = this.recomendaciones.adaptativo;
  readonly tipo = this.recomendaciones.tipo;
  readonly hayMas = this.recomendaciones.hayMas;
  readonly rangoSemana = this.planSemanal.rangoSemana;

  readonly ingredientes = INGREDIENTES_CATALOGO;
  readonly tipos: { valor: FiltroTipo; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'desayuno', etiqueta: 'Desayuno' },
    { valor: 'almuerzo', etiqueta: 'Almuerzo' },
    { valor: 'cena', etiqueta: 'Cena' },
  ];
  readonly dias = this.planSemanal.getDiasSemana().map((dia) => ({
    ...dia,
    api: sinTildes(dia.nombre).toLowerCase(),
  }));

  /** Sugerencia que está eligiendo día para agregarse a la semana. */
  readonly eligiendoDia = signal<string | null>(null);

  readonly pesoReuso = computed(() => 100 - this.pesoCosto());
  readonly nombresEnPlan = this.recomendaciones.nombresEnPlan;

  readonly ingredientesDelPlan = computed(() =>
    (this.resumen()?.ingredientesDelPlan ?? []).map((termino) => etiquetaDeIngrediente(termino)),
  );

  ngOnInit(): void {
    // El plan se carga para poder marcar las sugerencias que ya están en la semana.
    void this.planSemanal.cargar();
    void this.recomendaciones.cargar();
  }

  volver(): void {
    this.router.navigateByUrl('/tabs/plan-semanal');
  }

  reintentar(): void {
    void this.recomendaciones.cargar();
  }

  /** Mientras se mueve el deslizador solo cambia el número; se consulta al soltarlo. */
  moverPeso(evento: Event): void {
    this.recomendaciones.fijarPesoCosto(Number((evento.target as HTMLInputElement).value));
  }

  soltarPeso(): void {
    this.recomendaciones.cargarTrasPausa();
  }

  cambiarAdaptacion(evento: Event): void {
    void this.recomendaciones.activarAdaptacion((evento.target as HTMLInputElement).checked);
  }

  elegirTipo(tipo: FiltroTipo): void {
    void this.recomendaciones.elegirTipo(tipo);
  }

  estaExcluido(termino: string): boolean {
    return this.excluidos().includes(termino);
  }

  alternarExcluido(termino: string): void {
    void this.recomendaciones.alternarExcluido(termino);
  }

  limpiarExcluidos(): void {
    void this.recomendaciones.limpiarExcluidos();
  }

  verMas(): void {
    void this.recomendaciones.verMas();
  }

  abrirElegirDia(recetaId: string): void {
    this.eligiendoDia.set(this.eligiendoDia() === recetaId ? null : recetaId);
  }

  async agregar(sugerencia: Sugerencia, dia: { api: string; nombre: string }): Promise<void> {
    const agregada = await this.recomendaciones.aceptar(sugerencia.recetaId, dia.api, dia.nombre);
    if (agregada) {
      this.eligiendoDia.set(null);
      // El selector de día desaparece: el foco pasa al título de la receta para no perderlo.
      this.enfocarTitulo(sugerencia.recetaId);
    }
  }

  async descartar(sugerencia: Sugerencia): Promise<void> {
    const posicion = this.sugerencias().findIndex((s) => s.recetaId === sugerencia.recetaId);
    if (this.eligiendoDia() === sugerencia.recetaId) {
      this.eligiendoDia.set(null);
    }
    if (await this.recomendaciones.rechazar(sugerencia.recetaId)) {
      // La tarjeta se fue: el foco pasa a la que ocupa su lugar.
      const lista = this.sugerencias();
      this.enfocarTitulo(lista[Math.min(posicion, lista.length - 1)]?.recetaId);
    }
  }

  async volverAMostrar(): Promise<void> {
    // El botón desaparece al volver a mostrar: el foco pasa a la primera sugerencia.
    if (await this.recomendaciones.restablecer()) {
      this.enfocarTitulo(this.sugerencias()[0]?.recetaId);
    }
  }

  cerrarMensaje(): void {
    this.recomendaciones.cerrarMensaje();
  }

  private enfocarTitulo(recetaId: string | undefined): void {
    if (!recetaId) {
      return;
    }
    afterNextRender(
      () => this.raiz.nativeElement.querySelector<HTMLElement>(`[id="sug-titulo-${recetaId}"]`)?.focus(),
      { injector: this.injector },
    );
  }

  etiqueta(termino: string): string {
    return etiquetaDeIngrediente(termino);
  }

  etiquetas(terminos: string[]): string {
    return terminos.map((termino) => etiquetaDeIngrediente(termino)).join(', ');
  }

  cantidadIngrediente(ingrediente: { cantidad: number; unidad: string }): string {
    return formatearCantidad(ingrediente.cantidad, ingrediente.unidad);
  }

  precio(valor: number): string {
    return `$${valor.toLocaleString('es-CL')}`;
  }

  /** "21 nov, 15:00" o "sin dato" cuando todavía no hay precios de esa tienda. */
  fechaPrecios(fecha: Date | null | undefined): string {
    if (!fecha) {
      return 'sin dato';
    }
    return fecha.toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
