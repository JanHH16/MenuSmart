import { Tienda, TIENDAS } from '../python-client/scrape.types';

/** Cantidad de ejecuciones recientes por tienda que se consideran para las métricas. */
export const VENTANA_EJECUCIONES = 10;

export interface EjecucionResumen {
  tienda: string;
  estado: string;
  iniciadaEn: Date;
  finalizadaEn: Date | null;
  consultasTotal: number;
  consultasOk: number;
  consultasFallidas: number;
  registrosExtraidos: number;
  registrosValidos: number;
  registrosDuplicados: number;
  registrosDescartados: number;
  duracionMs: number | null;
}

export interface Cobertura {
  terminosConPrecio: number;
  terminosTotal: number;
  porcentaje: number;
}

export interface CalidadTienda {
  ultimaActualizacion: string | null;
  horasDesdeActualizacion: number | null;
  ejecucionesConsideradas: number;
  ultimaEjecucion: { estado: string; iniciadaEn: string } | null;
  registros: { extraidos: number; validos: number; duplicados: number; descartados: number };
  porcentajeValidos: number;
  porcentajeDuplicados: number;
  porcentajeDescartados: number;
  tasaErroresConsultas: number;
  duracionPromedioMs: number | null;
  cobertura: Cobertura;
}

export interface Calidad {
  generadoEn: string;
  ventanaEjecuciones: number;
  tiendas: Record<Tienda, CalidadTienda>;
  coberturaAmbasTiendas: Cobertura;
}

const MS_POR_HORA = 3_600_000;

const porcentaje = (parte: number, total: number): number =>
  total === 0 ? 0 : Math.round((parte / total) * 1000) / 10;

const suma = (valores: number[]): number => valores.reduce((acc, valor) => acc + valor, 0);

function calidadDeTienda(
  tienda: Tienda,
  ejecuciones: EjecucionResumen[],
  terminosConPrecio: Set<string>,
  totalTerminos: number,
  ahora: Date,
): CalidadTienda {
  const propias = ejecuciones
    .filter((e) => e.tienda === tienda && e.estado !== 'en_curso')
    .sort((a, b) => b.iniciadaEn.getTime() - a.iniciadaEn.getTime())
    .slice(0, VENTANA_EJECUCIONES);

  const exitosa = propias.find((e) => (e.estado === 'ok' || e.estado === 'parcial') && e.finalizadaEn);
  const extraidos = suma(propias.map((e) => e.registrosExtraidos));
  const consultas = suma(propias.map((e) => e.consultasTotal));
  const duraciones = propias.map((e) => e.duracionMs).filter((d): d is number => d !== null);

  return {
    ultimaActualizacion: exitosa?.finalizadaEn?.toISOString() ?? null,
    horasDesdeActualizacion: exitosa?.finalizadaEn
      ? Math.round(((ahora.getTime() - exitosa.finalizadaEn.getTime()) / MS_POR_HORA) * 10) / 10
      : null,
    ejecucionesConsideradas: propias.length,
    ultimaEjecucion: propias[0]
      ? { estado: propias[0].estado, iniciadaEn: propias[0].iniciadaEn.toISOString() }
      : null,
    registros: {
      extraidos,
      validos: suma(propias.map((e) => e.registrosValidos)),
      duplicados: suma(propias.map((e) => e.registrosDuplicados)),
      descartados: suma(propias.map((e) => e.registrosDescartados)),
    },
    porcentajeValidos: porcentaje(suma(propias.map((e) => e.registrosValidos)), extraidos),
    porcentajeDuplicados: porcentaje(suma(propias.map((e) => e.registrosDuplicados)), extraidos),
    porcentajeDescartados: porcentaje(suma(propias.map((e) => e.registrosDescartados)), extraidos),
    tasaErroresConsultas: porcentaje(suma(propias.map((e) => e.consultasFallidas)), consultas),
    duracionPromedioMs: duraciones.length
      ? Math.round(suma(duraciones) / duraciones.length)
      : null,
    cobertura: {
      terminosConPrecio: terminosConPrecio.size,
      terminosTotal: totalTerminos,
      porcentaje: porcentaje(terminosConPrecio.size, totalTerminos),
    },
  };
}

/**
 * Métricas de calidad de los datos recuperados: proporción de registros válidos, duplicados
 * y descartados, tasa de errores, tiempos, actualidad y cobertura del catálogo.
 */
export function calcularCalidad(
  ejecuciones: EjecucionResumen[],
  terminosConPrecio: Record<Tienda, Set<string>>,
  totalTerminos: number,
  ahora: Date,
): Calidad {
  const tiendas = Object.fromEntries(
    TIENDAS.map((tienda) => [
      tienda,
      calidadDeTienda(tienda, ejecuciones, terminosConPrecio[tienda], totalTerminos, ahora),
    ]),
  ) as Record<Tienda, CalidadTienda>;

  const enAmbas = [...terminosConPrecio.jumbo].filter((t) => terminosConPrecio.santa_isabel.has(t));
  return {
    generadoEn: ahora.toISOString(),
    ventanaEjecuciones: VENTANA_EJECUCIONES,
    tiendas,
    coberturaAmbasTiendas: {
      terminosConPrecio: enAmbas.length,
      terminosTotal: totalTerminos,
      porcentaje: porcentaje(enAmbas.length, totalTerminos),
    },
  };
}
