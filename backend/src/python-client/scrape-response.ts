import { ScrapedProduct, ScrapeError, ScrapeSearchResult, TIENDAS } from './scrape.types';

export class InvalidScrapeResponseError extends Error {}

const SLUG = /^[a-z0-9][a-z0-9-]{2,199}$/;
const ESTADOS = ['ok', 'parcial', 'fallido'];
const UNIDADES = ['kg', 'l', 'un'];
const CAMPOS_ESTADISTICAS = [
  'consultas_total',
  'consultas_ok',
  'consultas_fallidas',
  'registros_extraidos',
  'registros_validos',
  'registros_duplicados',
  'registros_descartados',
  'duracion_ms',
];

type Objeto = Record<string, unknown>;

const esObjeto = (valor: unknown): valor is Objeto =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const esTexto = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.trim().length > 0;
const esEnteroPositivo = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
const esNumeroPositivo = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
const esTextoONulo = (valor: unknown) => valor === null || esTexto(valor);
const esHttpsONulo = (valor: unknown) =>
  valor === null || (typeof valor === 'string' && valor.startsWith('https://'));

/** Valida un registro de producto según el contrato acordado con el servicio Python. */
export function esProductoValido(valor: unknown): valor is ScrapedProduct {
  if (!esObjeto(valor)) return false;
  return (
    esTexto(valor.consulta) &&
    typeof valor.external_id === 'string' &&
    SLUG.test(valor.external_id) &&
    esTexto(valor.nombre) &&
    esTexto(valor.nombre_normalizado) &&
    esTextoONulo(valor.marca) &&
    esEnteroPositivo(valor.precio) &&
    valor.moneda === 'CLP' &&
    (valor.cantidad === null || esNumeroPositivo(valor.cantidad)) &&
    (valor.unidad === null || (typeof valor.unidad === 'string' && UNIDADES.includes(valor.unidad))) &&
    (valor.precio_unitario === null || esEnteroPositivo(valor.precio_unitario)) &&
    typeof valor.disponible === 'boolean' &&
    typeof valor.url === 'string' &&
    valor.url.startsWith('https://') &&
    esHttpsONulo(valor.imagen)
  );
}

const esErrorValido = (valor: unknown): valor is ScrapeError =>
  esObjeto(valor) &&
  typeof valor.tipo === 'string' &&
  typeof valor.detalle === 'string' &&
  (valor.consulta === null || typeof valor.consulta === 'string');

/**
 * Valida la respuesta de POST /scrape/search. Si la estructura general no coincide con el
 * contrato lanza InvalidScrapeResponseError; los registros individuales inválidos se
 * descartan y se cuentan en `invalidos`.
 */
export function parseScrapeResponse(data: unknown): ScrapeSearchResult {
  if (!esObjeto(data)) throw new InvalidScrapeResponseError('la respuesta no es un objeto');
  if (typeof data.tienda !== 'string' || !(TIENDAS as readonly string[]).includes(data.tienda)) {
    throw new InvalidScrapeResponseError('tienda desconocida');
  }
  if (typeof data.estado !== 'string' || !ESTADOS.includes(data.estado)) {
    throw new InvalidScrapeResponseError('estado desconocido');
  }
  if (typeof data.obtenido_en !== 'string' || Number.isNaN(Date.parse(data.obtenido_en))) {
    throw new InvalidScrapeResponseError('fecha de obtención inválida');
  }
  if (!Array.isArray(data.resultados) || !Array.isArray(data.errores)) {
    throw new InvalidScrapeResponseError('faltan resultados o errores');
  }
  const estadisticas = data.estadisticas;
  if (!esObjeto(estadisticas)) throw new InvalidScrapeResponseError('faltan estadísticas');
  for (const campo of CAMPOS_ESTADISTICAS) {
    const valor = estadisticas[campo];
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
      throw new InvalidScrapeResponseError(`estadística inválida: ${campo}`);
    }
  }
  if (!esObjeto(estadisticas.descartes_por_motivo)) {
    throw new InvalidScrapeResponseError('faltan descartes por motivo');
  }

  const resultados = data.resultados.filter(esProductoValido);
  return {
    response: {
      tienda: data.tienda as ScrapeSearchResult['response']['tienda'],
      estado: data.estado as ScrapeSearchResult['response']['estado'],
      obtenido_en: data.obtenido_en,
      resultados,
      errores: data.errores.filter(esErrorValido),
      estadisticas: estadisticas as unknown as ScrapeSearchResult['response']['estadisticas'],
    },
    invalidos: data.resultados.length - resultados.length,
  };
}
