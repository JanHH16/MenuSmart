export const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy como AAAA-MM-DD en la hora local del servidor. */
export function hoyISO(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export function esFechaISOValida(valor: string): boolean {
  if (!FORMATO_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

/**
 * Lunes de la semana que contiene `fechaISO` (AAAA-MM-DD). Se calcula en UTC sobre la fecha
 * escrita, sin horas, para que la zona horaria del servidor no corra el dia.
 */
export function lunesDe(fechaISO: string): string {
  if (!esFechaISOValida(fechaISO)) {
    throw new RangeError(`Fecha invalida: ${fechaISO}`);
  }
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  const diasDesdeLunes = (fecha.getUTCDay() + 6) % 7;
  fecha.setUTCDate(fecha.getUTCDate() - diasDesdeLunes);
  return fecha.toISOString().slice(0, 10);
}

/** Indice del dia (lunes = 0) para ordenar comidas dentro de una semana. */
export function indiceDia(dia: string): number {
  const indice = DIAS_SEMANA.indexOf(dia as DiaSemana);
  return indice === -1 ? DIAS_SEMANA.length : indice;
}
