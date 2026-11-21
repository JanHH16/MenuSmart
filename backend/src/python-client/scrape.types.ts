export const TIENDAS = ['jumbo', 'santa_isabel'] as const;
export type Tienda = (typeof TIENDAS)[number];

export type UnidadBase = 'kg' | 'l' | 'un';

export interface ScrapeSearchRequest {
  tienda: Tienda;
  consultas: string[];
  max_resultados_por_consulta?: number;
}

export interface ScrapedProduct {
  consulta: string;
  external_id: string;
  nombre: string;
  nombre_normalizado: string;
  marca: string | null;
  precio: number;
  moneda: 'CLP';
  cantidad: number | null;
  unidad: UnidadBase | null;
  precio_unitario: number | null;
  disponible: boolean;
  url: string;
  imagen: string | null;
}

export interface ScrapeError {
  consulta: string | null;
  tipo: string;
  detalle: string;
}

export interface ScrapeStats {
  consultas_total: number;
  consultas_ok: number;
  consultas_fallidas: number;
  registros_extraidos: number;
  registros_validos: number;
  registros_duplicados: number;
  registros_descartados: number;
  descartes_por_motivo: Record<string, number>;
  duracion_ms: number;
}

export interface ScrapeSearchResponse {
  tienda: Tienda;
  estado: 'ok' | 'parcial' | 'fallido';
  obtenido_en: string;
  resultados: ScrapedProduct[];
  errores: ScrapeError[];
  estadisticas: ScrapeStats;
}

export interface ScrapeSearchResult {
  response: ScrapeSearchResponse;
  /** Registros que Python entregó pero NestJS descartó por no cumplir el contrato. */
  invalidos: number;
}

export interface ScrapeSearchOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}
