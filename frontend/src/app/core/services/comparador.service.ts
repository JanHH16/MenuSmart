import { Injectable } from '@angular/core';

export interface PrecioProducto {
  producto: string;
  cantidad: string;
  precios: number[];
}

/**
 * TODO: reemplazar por la boleta comparativa real, obtenida vía el servicio
 * Python de obtención/normalización de precios. Datos de ejemplo para
 * maquetar la vista según el diseño de Figma.
 */
@Injectable({ providedIn: 'root' })
export class ComparadorService {
  readonly tiendas = ['Jumbo', 'Santa Isabel'];

  private readonly productos: PrecioProducto[] = [
    { producto: 'Tomate (1 kg)', cantidad: '1 kg', precios: [1790, 1500] },
    { producto: 'Cebolla (1 kg)', cantidad: '1 kg', precios: [1490, 1180] },
    { producto: 'Lechuga', cantidad: '1 unid.', precios: [1890, 1350] },
    { producto: 'Pollo entero (1 kg)', cantidad: '1 kg', precios: [4990, 4850] },
    { producto: 'Carne para asado', cantidad: '0.8 kg', precios: [10490, 9900] },
    { producto: 'Tallarines 400 g', cantidad: '400 g', precios: [1190, 990] },
    { producto: 'Arroz 1 kg', cantidad: '1 kg', precios: [1190, 990] },
    { producto: 'Aceite 1 L', cantidad: '1 L', precios: [3190, 2890] },
    { producto: 'Queso 250 g', cantidad: '250 g', precios: [2590, 2190] },
    { producto: 'Huevos x12', cantidad: '12 unid.', precios: [3290, 2990] },
  ];

  getProductos(): PrecioProducto[] {
    return this.productos;
  }

  getTotales(): number[] {
    return this.tiendas.map((_, i) =>
      this.productos.reduce((total, producto) => total + producto.precios[i], 0),
    );
  }

  getTiendaMasBarata(): { indice: number; ahorro: number } {
    const totales = this.getTotales();
    const menor = Math.min(...totales);
    const mayor = Math.max(...totales);
    return { indice: totales.indexOf(menor), ahorro: mayor - menor };
  }
}
