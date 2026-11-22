import { esProductoRelevante } from './relevancia';

describe('esProductoRelevante', () => {
  it.each([
    ['tomate', 'Tomate Larga Vida Malla 1 kg'],
    ['tomate', 'Tomates Cherry 500 g'],
    ['cebolla', 'Cebolla Malla 1 kg'],
    ['arroz', 'Arroz Grado 2 Máxima Grano Largo 1 kg'],
    ['pollo', 'Trutro Corto de Pollo Sin Marinar'],
    ['pollo', 'Pechuga Deshuesada 1 kg'],
    ['fideos', 'Tallarines N°5 Carozzi 400 g'],
    ['salsa de tomate', 'Salsa de Tomate Tradicional 200 g'],
    ['platano', 'Plátano 1 kg'],
    ['huevos', 'Huevo Blanco Docena'],
  ])('acepta "%s" para %p', (termino, producto) => {
    expect(esProductoRelevante(termino, producto)).toBe(true);
  });

  it.each([
    ['tomate', 'Puré de Tomate Mutti Passat 400 g'],
    ['tomate', 'Salsa Pomarola Tomate 200 g'],
    ['lechuga', 'Corazón Costina 3 un.'],
    ['limon', 'Jugo de Limón Sureño 1 L'],
    ['arroz', 'Postre Arroz con Leche'],
    ['papa', 'Snack de Papas Fritas'],
    ['manzana', 'Néctar de Manzana 1 L'],
    ['zanahoria', 'Picado Infantil Zanahoria 113 g'],
    ['manzana', 'Papilla Bebé Manzana 90 g'],
  ])('descarta %p para %p', (termino, producto) => {
    expect(esProductoRelevante(termino, producto)).toBe(false);
  });

  it('no deja que el termino compuesto se confunda con una palabra suelta', () => {
    expect(esProductoRelevante('salsa de tomate', 'Tomate Larga Vida 1 kg')).toBe(false);
  });
});
