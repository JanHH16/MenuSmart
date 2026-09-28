import { Injectable, inject } from '@angular/core';
import { PlanSemanalService } from './plan-semanal.service';

export interface ItemCompra {
  id: string;
  nombre: string;
  cantidad: string;
  comprado: boolean;
}

export interface CategoriaCompra {
  nombre: string;
  items: ItemCompra[];
}

/**
 * TODO: reemplazar por la lista de compras real, generada por el backend a
 * partir del plan semanal (ver PlanSemanalService). Por ahora son datos de
 * ejemplo para maquetar la vista según el diseño de Figma.
 */
@Injectable({ providedIn: 'root' })
export class ListaComprasService {
  private readonly planSemanalService = inject(PlanSemanalService);

  private readonly categorias: CategoriaCompra[] = [
    {
      nombre: 'Verduras',
      items: [
        { id: '1', nombre: 'Tomate', cantidad: '6 unid.', comprado: true },
        { id: '2', nombre: 'Cebolla', cantidad: '3 unid.', comprado: false },
        { id: '3', nombre: 'Lechuga', cantidad: '1 unid.', comprado: false },
      ],
    },
    {
      nombre: 'Carnes',
      items: [
        { id: '4', nombre: 'Pollo entero', cantidad: '1 kg', comprado: false },
        { id: '5', nombre: 'Carne para asado', cantidad: '1,5 kg', comprado: false },
      ],
    },
    {
      nombre: 'Despensa',
      items: [
        { id: '6', nombre: 'Tallarines', cantidad: '400 g', comprado: true },
        { id: '7', nombre: 'Arroz', cantidad: '1 kg', comprado: false },
        { id: '8', nombre: 'Aceite', cantidad: '1 L', comprado: false },
      ],
    },
    {
      nombre: 'Lácteos y huevos',
      items: [
        { id: '9', nombre: 'Queso', cantidad: '250 g', comprado: false },
        { id: '10', nombre: 'Huevos', cantidad: '12 unid.', comprado: false },
      ],
    },
  ];

  getLista(): CategoriaCompra[] {
    return this.categorias;
  }

  getTotalComidas(): number {
    return this.planSemanalService.getTotalComidas();
  }

  totalItems(): number {
    return this.categorias.reduce((total, categoria) => total + categoria.items.length, 0);
  }

  itemsComprados(): number {
    return this.categorias.reduce(
      (total, categoria) => total + categoria.items.filter((item) => item.comprado).length,
      0,
    );
  }
}
