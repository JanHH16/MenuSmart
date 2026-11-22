import { Injectable } from '@nestjs/common';

const MUESTRAS_POR_RUTA = 500;

interface DatosRuta {
  total: number;
  errores: number;
  muestrasMs: number[];
}

interface DatosFuente {
  corridas: number;
  porEstado: Record<string, number>;
  erroresPorTipo: Record<string, number>;
  duraciones: number[];
}

export function percentil(muestras: number[], p: number): number {
  if (muestras.length === 0) return 0;
  const ordenadas = [...muestras].sort((a, b) => a - b);
  const indice = Math.min(ordenadas.length - 1, Math.max(0, Math.round((p / 100) * ordenadas.length) - 1));
  return ordenadas[indice];
}

const promedio = (valores: number[]) =>
  valores.length === 0 ? 0 : valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
const redondear = (valor: number) => Math.round(valor * 100) / 100;

/**
 * Contadores y tiempos de respuesta por ruta, mas el resultado de las actualizaciones de
 * precios (errores de la fuente externa). Viven en memoria y se reinician con el proceso.
 */
@Injectable()
export class MetricsService {
  private readonly iniciadoEn = new Date();
  private readonly rutas = new Map<string, DatosRuta>();
  private readonly fuentes = new Map<string, DatosFuente>();

  registrarSolicitud(metodo: string, ruta: string, status: number, milisegundos: number): void {
    const clave = `${metodo} ${ruta}`;
    const datos = this.rutas.get(clave) ?? { total: 0, errores: 0, muestrasMs: [] };
    datos.total += 1;
    if (status >= 500) datos.errores += 1;
    datos.muestrasMs.push(milisegundos);
    if (datos.muestrasMs.length > MUESTRAS_POR_RUTA) datos.muestrasMs.shift();
    this.rutas.set(clave, datos);
  }

  registrarActualizacion(
    tienda: string,
    estado: string,
    duracionMs: number,
    erroresPorTipo: Record<string, number>,
  ): void {
    const datos = this.fuentes.get(tienda) ?? {
      corridas: 0,
      porEstado: {},
      erroresPorTipo: {},
      duraciones: [],
    };
    datos.corridas += 1;
    datos.porEstado[estado] = (datos.porEstado[estado] ?? 0) + 1;
    for (const [tipo, cantidad] of Object.entries(erroresPorTipo)) {
      datos.erroresPorTipo[tipo] = (datos.erroresPorTipo[tipo] ?? 0) + cantidad;
    }
    datos.duraciones.push(duracionMs);
    this.fuentes.set(tienda, datos);
  }

  snapshot() {
    const rutas = [...this.rutas.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ruta, datos]) => ({
        ruta,
        solicitudes: datos.total,
        errores5xx: datos.errores,
        promedioMs: redondear(promedio(datos.muestrasMs)),
        p50Ms: redondear(percentil(datos.muestrasMs, 50)),
        p95Ms: redondear(percentil(datos.muestrasMs, 95)),
      }));
    const fuenteExterna = Object.fromEntries(
      [...this.fuentes.entries()].map(([tienda, datos]) => [
        tienda,
        {
          corridas: datos.corridas,
          porEstado: datos.porEstado,
          erroresPorTipo: datos.erroresPorTipo,
          duracionPromedioMs: redondear(promedio(datos.duraciones)),
        },
      ]),
    );
    return {
      servicio: 'menusmart-backend',
      iniciadoEn: this.iniciadoEn.toISOString(),
      solicitudesTotal: rutas.reduce((suma, ruta) => suma + ruta.solicitudes, 0),
      rutas,
      fuenteExterna,
    };
  }
}
