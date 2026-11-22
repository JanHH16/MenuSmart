export interface CantidadParseada {
  cantidad: number;
  unidad: string;
}

// La fracción va primero: si no, "1/2" se leería como "1" seguido de la unidad "/2".
const PATRON = /^\s*(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*(.*?)\s*$/;

/**
 * Convierte lo que escribe el usuario ("400 g", "1,5 kg", "1/2 taza", "4 unid.") en cantidad y
 * unidad. Sin unidad, se asume una unidad suelta. Devuelve null si no empieza con un número.
 */
export function parsearCantidad(texto: string): CantidadParseada | null {
  const coincidencia = PATRON.exec(texto);
  if (!coincidencia) {
    return null;
  }
  const crudo = coincidencia[1];
  let cantidad: number;
  if (crudo.includes('/')) {
    const [numerador, denominador] = crudo.split('/').map((parte) => Number(parte.trim()));
    cantidad = denominador === 0 ? NaN : numerador / denominador;
  } else {
    cantidad = Number(crudo.replace(',', '.'));
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return null;
  }
  return { cantidad: Math.round(cantidad * 1000) / 1000, unidad: coincidencia[2] || 'un' };
}

/** Cantidad y unidad como texto para mostrar: 0.8 + "kg" => "0,8 kg"; 4 + "un" => "4 unid.". */
export function formatearCantidad(cantidad: number, unidad: string): string {
  // Sin separador de miles: "1.500 g" se volvería a leer como 1,5 al editar la comida.
  const numero = cantidad.toLocaleString('es-CL', { maximumFractionDigits: 3, useGrouping: false });
  return `${numero} ${unidad === 'un' ? 'unid.' : unidad}`;
}
