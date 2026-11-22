export interface TerminoCatalogo {
  termino: string;
  categoria: string;
}

/**
 * Ingredientes canónicos que el sistema busca en cada tienda. Son consultas de búsqueda,
 * no productos: de cada una se guardan los primeros resultados de la tienda.
 */
export const CATALOGO: readonly TerminoCatalogo[] = [
  { termino: 'arroz', categoria: 'despensa' },
  { termino: 'fideos', categoria: 'despensa' },
  { termino: 'harina', categoria: 'despensa' },
  { termino: 'azucar', categoria: 'despensa' },
  { termino: 'aceite', categoria: 'despensa' },
  { termino: 'sal', categoria: 'despensa' },
  { termino: 'lentejas', categoria: 'despensa' },
  { termino: 'porotos', categoria: 'despensa' },
  { termino: 'atun', categoria: 'despensa' },
  { termino: 'salsa de tomate', categoria: 'despensa' },
  { termino: 'pollo', categoria: 'carnes' },
  { termino: 'carne molida', categoria: 'carnes' },
  { termino: 'cerdo', categoria: 'carnes' },
  { termino: 'merluza', categoria: 'pescados' },
  { termino: 'salmon', categoria: 'pescados' },
  { termino: 'tomate', categoria: 'frutas y verduras' },
  { termino: 'cebolla', categoria: 'frutas y verduras' },
  { termino: 'papa', categoria: 'frutas y verduras' },
  { termino: 'zanahoria', categoria: 'frutas y verduras' },
  { termino: 'lechuga', categoria: 'frutas y verduras' },
  { termino: 'palta', categoria: 'frutas y verduras' },
  { termino: 'limon', categoria: 'frutas y verduras' },
  { termino: 'manzana', categoria: 'frutas y verduras' },
  { termino: 'platano', categoria: 'frutas y verduras' },
  { termino: 'zapallo', categoria: 'frutas y verduras' },
  { termino: 'leche', categoria: 'lacteos y huevos' },
  { termino: 'huevos', categoria: 'lacteos y huevos' },
  { termino: 'queso', categoria: 'lacteos y huevos' },
  { termino: 'mantequilla', categoria: 'lacteos y huevos' },
  { termino: 'yogurt', categoria: 'lacteos y huevos' },
  { termino: 'pan', categoria: 'panaderia' },
];

export const TERMINOS: readonly string[] = CATALOGO.map((item) => item.termino);

export function categoriaDeTermino(termino: string): string {
  return CATALOGO.find((item) => item.termino === termino)?.categoria ?? 'otros';
}
