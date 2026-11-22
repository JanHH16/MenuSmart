import { seconds } from '@nestjs/throttler';

/**
 * Limites de solicitudes por IP, configurables por variables de entorno.
 *
 * Se leen en cada solicitud (no al arrancar) para que sea facil ajustarlos en pruebas sin
 * apagar el guard. Un valor ausente o invalido cae al valor por defecto, nunca a "sin limite".
 * Los contadores viven en memoria: con varias instancias cada una cuenta por separado.
 */
function entero(nombre: string, porDefecto: number): number {
  const valor = Number(process.env[nombre]);
  return Number.isInteger(valor) && valor > 0 ? valor : porDefecto;
}

function limite(prefijo: string, maximoPorDefecto: number, ventanaPorDefecto: number) {
  return {
    limit: () => entero(`${prefijo}_MAX`, maximoPorDefecto),
    ttl: () => seconds(entero(`${prefijo}_WINDOW_SECONDS`, ventanaPorDefecto)),
  };
}

/** Limite general, aplicado a todas las rutas: generoso, solo frena abusos evidentes. */
export const LIMITE_GLOBAL = limite('RATE_LIMIT_GLOBAL', 300, 60);
/** POST /api/auth/login: frena la fuerza bruta de contrasenas. */
export const LIMITE_LOGIN = limite('RATE_LIMIT_LOGIN', 10, 60);
/** POST /api/auth/register: frena la creacion masiva de cuentas. */
export const LIMITE_REGISTRO = limite('RATE_LIMIT_REGISTER', 5, 60);
/** POST /api/prices/refresh: protege a las tiendas externas (cada llamada dispara scraping). */
export const LIMITE_ACTUALIZAR_PRECIOS = limite('RATE_LIMIT_REFRESH', 5, 60);
