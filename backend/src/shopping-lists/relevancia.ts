/**
 * Filtro de relevancia para la estimacion de costo. La busqueda de la tienda devuelve productos
 * "parecidos" (un puré de tomate para "tomate"), y el mas barato por kilo suele ser uno de ellos.
 * Antes de elegir el mas barato se descartan los que no nombran el ingrediente o son un derivado
 * procesado. Es una heuristica por nombre: reduce los errores, no los elimina.
 */

const sinTildes = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Palabras que indican un derivado procesado y no el ingrediente en si. */
const PALABRAS_PROCESADO = new Set([
  'pure',
  'salsa',
  'jugo',
  'nectar',
  'pasta',
  'conserva',
  'sopa',
  'ketchup',
  'mermelada',
  'galleta',
  'galletas',
  'snack',
  'bebida',
  'aderezo',
  'mayonesa',
  'postre',
  'deshidratado',
  'deshidratada',
  'polvo',
  'extracto',
  'saborizante',
  'gelatina',
  'helado',
  // Alimentos para bebes: llevan el nombre del ingrediente ("zanahoria picado infantil").
  'infantil',
  'bebe',
  'papilla',
  'colado',
  'colados',
]);

/** Nombres con los que se vende realmente el ingrediente cuando no coinciden con el termino. */
const ALTERNATIVAS: Record<string, string[]> = {
  fideos: ['fideo', 'tallarin', 'tallarines', 'espagueti', 'espaguetis', 'spaghetti', 'macarrones'],
  pollo: ['pollo', 'pechuga', 'trutro', 'trutros', 'tuto', 'muslo', 'muslos'],
  cerdo: ['cerdo', 'lomo', 'chuleta', 'chuletas', 'costillar'],
  'carne molida': ['molida'],
  platano: ['platano', 'platanos', 'banana', 'bananas'],
  yogurt: ['yogur', 'yogurt', 'yoghurt'],
  pan: ['pan', 'marraqueta', 'hallulla'],
  porotos: ['poroto', 'porotos', 'frejol', 'frejoles'],
  papa: ['papa', 'papas'],
  huevos: ['huevo', 'huevos'],
};

function nombraAlTermino(termino: string, palabras: string[]): boolean {
  const tokens = termino.split(' ');
  const todas = tokens.every((token) =>
    palabras.some(
      (palabra) =>
        palabra === token ||
        palabra === `${token}s` ||
        palabra === `${token}es` ||
        (token.endsWith('s') && palabra === token.slice(0, -1)),
    ),
  );
  return todas || (ALTERNATIVAS[termino] ?? []).some((alternativa) => palabras.includes(alternativa));
}

/** ¿El nombre de un producto corresponde al ingrediente (termino del catalogo)? */
export function esProductoRelevante(terminoCatalogo: string, nombreProducto: string): boolean {
  const termino = sinTildes(terminoCatalogo);
  const palabras = sinTildes(nombreProducto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!nombraAlTermino(termino, palabras)) return false;

  const palabrasDelTermino = termino.split(' ');
  return !palabras.some(
    (palabra) => PALABRAS_PROCESADO.has(palabra) && !palabrasDelTermino.includes(palabra),
  );
}
