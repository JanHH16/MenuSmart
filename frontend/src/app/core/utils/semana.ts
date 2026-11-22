/** Fecha local como AAAA-MM-DD. */
export function hoyISO(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Lunes de la semana que contiene la fecha, calculado sobre la fecha escrita (sin zonas horarias). */
export function lunesDe(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  const diasDesdeLunes = (fecha.getUTCDay() + 6) % 7;
  fecha.setUTCDate(fecha.getUTCDate() - diasDesdeLunes);
  return fecha.toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha AAAA-MM-DD. */
export function sumarDias(fechaISO: string, dias: number): string {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "23 - 29 nov", o "27 nov - 3 dic" cuando la semana cruza de mes. */
export function rangoDeSemana(lunesISO: string): string {
  const inicio = new Date(`${lunesISO}T00:00:00Z`);
  const fin = new Date(`${sumarDias(lunesISO, 6)}T00:00:00Z`);
  const mesInicio = MESES_CORTOS[inicio.getUTCMonth()];
  const mesFin = MESES_CORTOS[fin.getUTCMonth()];
  return inicio.getUTCMonth() === fin.getUTCMonth()
    ? `${inicio.getUTCDate()} - ${fin.getUTCDate()} ${mesFin}`
    : `${inicio.getUTCDate()} ${mesInicio} - ${fin.getUTCDate()} ${mesFin}`;
}
