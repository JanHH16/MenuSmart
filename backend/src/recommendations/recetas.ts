export type UnidadBase = 'kg' | 'l' | 'un';

export interface RecetaIngrediente {
  /** Termino del catalogo de precios (ver prices/catalogo.ts). */
  termino: string;
  /** Cantidad total para la receta completa, en la unidad base del termino. */
  cantidad: number;
  unidad: UnidadBase;
}

export interface Receta {
  id: string;
  nombre: string;
  tipo: 'desayuno' | 'almuerzo' | 'cena';
  porciones: number;
  ingredientes: RecetaIngrediente[];
}

const kg = (termino: string, cantidad: number): RecetaIngrediente => ({
  termino,
  cantidad,
  unidad: 'kg',
});
const l = (termino: string, cantidad: number): RecetaIngrediente => ({
  termino,
  cantidad,
  unidad: 'l',
});
const un = (termino: string, cantidad: number): RecetaIngrediente => ({
  termino,
  cantidad,
  unidad: 'un',
});

/**
 * Recetas de base para recomendar. Son platos caseros chilenos de uso comun; las cantidades
 * son aproximadas y estan expresadas en la unidad en que las tiendas fijan el precio unitario
 * de cada ingrediente, para poder estimar el costo sin conversiones.
 */
export const RECETAS: readonly Receta[] = [
  {
    id: 'arroz-con-pollo',
    nombre: 'Arroz con pollo',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('arroz', 0.4), kg('pollo', 0.8), kg('cebolla', 0.2), kg('zanahoria', 0.2), l('aceite', 0.03)],
  },
  {
    id: 'tallarines-con-salsa',
    nombre: 'Tallarines con salsa de tomate',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('fideos', 0.4), kg('salsa de tomate', 0.4), kg('cebolla', 0.2), kg('queso', 0.1), l('aceite', 0.03)],
  },
  {
    id: 'lentejas-con-arroz',
    nombre: 'Lentejas con arroz',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('lentejas', 0.4), kg('arroz', 0.2), kg('zanahoria', 0.2), kg('cebolla', 0.2), l('aceite', 0.03)],
  },
  {
    id: 'pastel-de-papas',
    nombre: 'Pastel de papas',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('papa', 1), kg('carne molida', 0.5), kg('cebolla', 0.3), un('huevos', 4), l('leche', 0.1), kg('mantequilla', 0.05)],
  },
  {
    id: 'cazuela-de-pollo',
    nombre: 'Cazuela de pollo',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('pollo', 1), kg('papa', 0.6), kg('zapallo', 0.5), kg('zanahoria', 0.2), kg('arroz', 0.2), kg('cebolla', 0.2)],
  },
  {
    id: 'porotos-con-fideos',
    nombre: 'Porotos con fideos',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('porotos', 0.4), kg('fideos', 0.2), kg('zapallo', 0.3), kg('cebolla', 0.2), l('aceite', 0.03)],
  },
  {
    id: 'tortilla-de-papas',
    nombre: 'Tortilla de papas',
    tipo: 'cena',
    porciones: 4,
    ingredientes: [kg('papa', 0.8), un('huevos', 6), kg('cebolla', 0.2), l('aceite', 0.1)],
  },
  {
    id: 'ensalada-chilena',
    nombre: 'Ensalada chilena con pan',
    tipo: 'cena',
    porciones: 4,
    ingredientes: [kg('tomate', 0.6), kg('cebolla', 0.3), kg('limon', 0.1), kg('pan', 0.3), l('aceite', 0.03)],
  },
  {
    id: 'pollo-al-horno',
    nombre: 'Pollo al horno con papas',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('pollo', 1.2), kg('papa', 1), kg('limon', 0.1), l('aceite', 0.03)],
  },
  {
    id: 'merluza-al-horno',
    nombre: 'Merluza al horno con ensalada',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('merluza', 0.6), kg('limon', 0.1), un('lechuga', 1), kg('tomate', 0.3), kg('papa', 0.6)],
  },
  {
    id: 'salmon-con-arroz',
    nombre: 'Salmón con arroz',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('salmon', 0.6), kg('arroz', 0.3), kg('limon', 0.1), kg('zanahoria', 0.2)],
  },
  {
    id: 'hamburguesas-caseras',
    nombre: 'Hamburguesas caseras',
    tipo: 'cena',
    porciones: 4,
    ingredientes: [kg('carne molida', 0.6), kg('pan', 0.3), kg('cebolla', 0.2), un('huevos', 1), un('lechuga', 1), kg('tomate', 0.3)],
  },
  {
    id: 'charquican',
    nombre: 'Charquicán',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('carne molida', 0.4), kg('papa', 0.8), kg('zapallo', 0.4), kg('zanahoria', 0.2), kg('cebolla', 0.2), un('huevos', 2)],
  },
  {
    id: 'tortilla-de-verduras',
    nombre: 'Tortilla de verduras',
    tipo: 'cena',
    porciones: 3,
    ingredientes: [un('huevos', 6), kg('zanahoria', 0.2), kg('cebolla', 0.2), kg('zapallo', 0.3), l('aceite', 0.03)],
  },
  {
    id: 'atun-con-arroz',
    nombre: 'Atún con arroz y ensalada',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('atun', 0.3), kg('arroz', 0.3), kg('tomate', 0.4), un('lechuga', 1), kg('limon', 0.1)],
  },
  {
    id: 'fideos-con-atun',
    nombre: 'Fideos con atún',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('fideos', 0.4), kg('atun', 0.3), kg('salsa de tomate', 0.3), kg('cebolla', 0.2)],
  },
  {
    id: 'sopa-de-zapallo',
    nombre: 'Crema de zapallo',
    tipo: 'cena',
    porciones: 4,
    ingredientes: [kg('zapallo', 1), kg('cebolla', 0.2), kg('papa', 0.3), l('leche', 0.2), kg('mantequilla', 0.03)],
  },
  {
    id: 'panqueques',
    nombre: 'Panqueques',
    tipo: 'desayuno',
    porciones: 4,
    ingredientes: [kg('harina', 0.25), l('leche', 0.5), un('huevos', 3), kg('mantequilla', 0.05), kg('azucar', 0.03)],
  },
  {
    id: 'yogurt-con-frutas',
    nombre: 'Yogurt con frutas',
    tipo: 'desayuno',
    porciones: 2,
    ingredientes: [kg('yogurt', 0.4), kg('manzana', 0.3), kg('platano', 0.24)],
  },
  {
    id: 'pan-con-palta-y-huevo',
    nombre: 'Pan con palta y huevo',
    tipo: 'desayuno',
    porciones: 2,
    ingredientes: [kg('pan', 0.2), kg('palta', 0.3), un('huevos', 2)],
  },
  {
    id: 'pan-con-queso',
    nombre: 'Pan con queso y mantequilla',
    tipo: 'desayuno',
    porciones: 2,
    ingredientes: [kg('pan', 0.2), kg('queso', 0.1), kg('mantequilla', 0.03)],
  },
  {
    id: 'estofado-de-cerdo',
    nombre: 'Estofado de cerdo con papas',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('cerdo', 0.8), kg('papa', 0.8), kg('cebolla', 0.3), kg('zanahoria', 0.3), l('aceite', 0.03)],
  },
  {
    id: 'arroz-con-huevo',
    nombre: 'Arroz con huevo y ensalada',
    tipo: 'almuerzo',
    porciones: 3,
    ingredientes: [kg('arroz', 0.3), un('huevos', 6), kg('tomate', 0.4), kg('cebolla', 0.2), l('aceite', 0.03)],
  },
  {
    id: 'pollo-con-fideos',
    nombre: 'Pollo con fideos',
    tipo: 'almuerzo',
    porciones: 4,
    ingredientes: [kg('pollo', 0.8), kg('fideos', 0.4), kg('zanahoria', 0.2), kg('cebolla', 0.2)],
  },
  {
    id: 'ensalada-de-lentejas',
    nombre: 'Ensalada de lentejas',
    tipo: 'cena',
    porciones: 3,
    ingredientes: [kg('lentejas', 0.3), kg('tomate', 0.3), kg('cebolla', 0.2), kg('limon', 0.1), l('aceite', 0.03)],
  },
];

export function recetaPorId(id: string): Receta | undefined {
  return RECETAS.find((receta) => receta.id === id);
}
