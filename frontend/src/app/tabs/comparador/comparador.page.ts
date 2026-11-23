import { Component, computed, inject, OnInit } from '@angular/core';
import { LayoutService } from '../../core/services/layout.service';
import { ComparadorService, PrecioProducto } from '../../core/services/comparador.service';
import { ListaComprasService } from '../../core/services/lista-compras.service';

@Component({
  selector: 'app-comparador',
  templateUrl: './comparador.page.html',
  styleUrls: ['./comparador.page.scss'],
  standalone: false,
})
export class ComparadorPage implements OnInit {
  private readonly comparadorService = inject(ComparadorService);
  private readonly layoutService = inject(LayoutService);
  private readonly listaCompras = inject(ListaComprasService);

  readonly esDesktop$ = this.layoutService.esDesktop$;
  readonly tiendas = this.comparadorService.tiendas;
  readonly productos = this.comparadorService.productos;
  readonly estado = this.comparadorService.estado;
  readonly actualizando = this.comparadorService.actualizando;
  readonly mensaje = this.comparadorService.mensaje;
  readonly hayDesactualizados = this.comparadorService.hayDesactualizados;
  readonly ultimaActualizacion = this.comparadorService.ultimaActualizacion;

  readonly exito = this.comparadorService.exito;
  readonly progreso = this.comparadorService.progreso;

  /** Tu lista de la semana con el costo de cada producto en las dos tiendas. */
  private readonly itemsLista = computed(() => this.listaCompras.categorias().flatMap((c) => c.items));
  /** Solo lo que falta comprar: lo marcado en la lista de compras (ya lo tengo / en el carro) no se compara. */
  readonly itemsPendientes = computed(() => this.itemsLista().filter((item) => !item.comprado));
  /** Si hay una lista de compras, el comparador se arma con ella; si no, con los productos idénticos de las tiendas. */
  readonly hayLista = computed(() => this.itemsLista().length > 0);
  readonly mostrarMiLista = this.hayLista;
  readonly filasEsqueleto = [0, 1, 2, 3, 4, 5];

  /** Filas de la boleta con tu lista: solo los productos sin marcar que tienen precio en las dos tiendas. */
  private readonly filasDeLista = computed<PrecioProducto[]>(() =>
    this.itemsPendientes()
      .filter((item) => item.costoJumbo !== null && item.costoSantaIsabel !== null)
      .map((item) => ({
        slug: item.id,
        producto: `${item.nombre} · ${item.cantidad}`,
        cantidad: item.cantidad,
        precios: [item.costoJumbo ?? 0, item.costoSantaIsabel ?? 0],
      })),
  );

  /** Lo que se muestra en la boleta: tu lista, o los productos idénticos si todavía no hay lista. */
  readonly filas = computed(() => (this.hayLista() ? this.filasDeLista() : this.productos()));

  readonly hayBoleta = computed(
    () => this.filas().length > 0 && (this.hayLista() || this.estado() === 'listo'),
  );

  readonly subtituloBoleta = computed(() =>
    this.hayLista()
      ? `Lo que te falta comprar · ${this.filas().length} productos`
      : `${this.filas().length} productos`,
  );

  /** Productos de tu lista que no se pudieron valorizar en alguna tienda: se avisan y no se suman. */
  readonly sinPrecio = computed(() =>
    this.itemsPendientes()
      .filter((item) => item.costoJumbo === null || item.costoSantaIsabel === null)
      .map((item) => item.nombre),
  );

  readonly totales = computed(() =>
    this.tiendas.map((_, i) => this.filas().reduce((total, fila) => total + fila.precios[i], 0)),
  );

  /** `indice` es null si las dos tiendas suman lo mismo. */
  readonly tiendaMasBarata = computed<{ indice: number | null; ahorro: number }>(() => {
    const totales = this.totales();
    const menor = Math.min(...totales);
    const mayor = Math.max(...totales);
    const ganadoras = totales.filter((total) => total === menor).length;
    return { indice: ganadoras === 1 ? totales.indexOf(menor) : null, ahorro: mayor - menor };
  });

  private primeraEntrada = true;

  readonly ganadora = computed(() => {
    const indice = this.tiendaMasBarata().indice;
    return indice === null ? null : this.tiendas[indice];
  });

  ngOnInit(): void {
    this.cargarTodo();
  }

  /**
   * Ionic mantiene las pestañas vivas: ngOnInit no se repite al volver. Sin esto el comparador
   * seguía mostrando la lista de compras de la primera visita aunque se hubiera cambiado el plan.
   */
  ionViewWillEnter(): void {
    if (this.primeraEntrada) {
      this.primeraEntrada = false;
      return;
    }
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.comparadorService.cargar();
    void this.listaCompras.cargar();
  }

  actualizar(): void {
    this.comparadorService.actualizar();
  }

  reintentar(): void {
    this.comparadorService.cargar();
  }

  /** "21 nov, 14:32", o "sin datos" si la tienda nunca se ha actualizado. */
  formatFecha(fecha: Date | null): string {
    if (!fecha) {
      return 'sin datos';
    }
    return fecha.toLocaleString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  esMasBarato(producto: PrecioProducto, indiceTienda: number): boolean {
    return producto.precios[indiceTienda] === Math.min(...producto.precios);
  }

  formatPrecio(valor: number): string {
    return `$${valor.toLocaleString('es-CL')}`;
  }

  // Diferencia / "más barato" asumen exactamente 2 tiendas, como el diseño
  // de Figma ("Jumbo vs. Santa Isabel").
  diferencia(producto: PrecioProducto): number {
    return Math.abs(producto.precios[0] - producto.precios[1]);
  }

  // Misma regla que esMasBarato() (Math.min), en vez de comparar
  // precios[0] < precios[1] por separado: antes, con precios iguales,
  // esMasBarato() marcaba las DOS celdas como "más baratas" pero este método
  // igual elegía Santa Isabel (el índice 1 gana empates en "< "), mostrando
  // un sello contradictorio con la tabla.
  masBaratoNombre(producto: PrecioProducto): string {
    const indice = this.indiceMasBarato(producto);
    if (indice === null) {
      return 'Empate';
    }
    return this.abreviar(this.tiendas[indice]);
  }

  private indiceMasBarato(producto: PrecioProducto): number | null {
    const minimo = Math.min(...producto.precios);
    const indices = producto.precios.reduce<number[]>((acc, precio, i) => {
      if (precio === minimo) {
        acc.push(i);
      }
      return acc;
    }, []);
    return indices.length === 1 ? indices[0] : null;
  }

  // En los timbres chicos Figma escribe "S. Isabel".
  abreviar(tienda: string): string {
    return tienda === 'Santa Isabel' ? 'S. Isabel' : tienda;
  }

  barraAncho(total: number): number {
    const max = Math.max(...this.totales());
    return max === 0 ? 0 : Math.round((total / max) * 100);
  }

  // Figma: nota "ojo: …" con el producto que conviene comprar en la OTRA
  // tienda (la que no gana en el total), el de mayor diferencia. Si no hay
  // ninguno, no se muestra la nota.
  readonly consejo = computed(() => this.calcularConsejo());

  // Código de barras decorativo del pie de la boleta (Figma: barcode()).
  readonly barras = this.calcularBarras(220);

  private calcularConsejo(): { producto: string; ahorro: number; tienda: string } | null {
    const ganadora = this.tiendaMasBarata().indice;
    if (ganadora === null) {
      return null;
    }
    let mejor: { producto: string; ahorro: number; tienda: string } | null = null;
    for (const producto of this.filas()) {
      const barata = this.indiceMasBarato(producto);
      const ahorro = this.diferencia(producto);
      if (barata !== null && barata !== ganadora && (!mejor || ahorro > mejor.ahorro)) {
        mejor = { producto: producto.producto.toLowerCase(), ahorro, tienda: this.tiendas[barata] };
      }
    }
    return mejor;
  }

  private calcularBarras(ancho: number): { x: number; w: number }[] {
    const patron = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 3, 2, 1, 2];
    const barras: { x: number; w: number }[] = [];
    for (let x = 0, i = 0; x < ancho; i++) {
      const w = patron[i % patron.length];
      if (i % 2 === 0) {
        barras.push({ x, w });
      }
      x += w + 1.5;
    }
    return barras;
  }
}