/** Cabecera con la clave compartida que el servicio Python exige cuando no es privado. */
export const CABECERA_CLAVE_SERVICIO = 'X-Service-Key';

export const TIMEOUT_PYTHON_POR_DEFECTO_MS = 5000;

type Lector = (clave: string) => string | undefined;

const desdeEntorno: Lector = (clave) => process.env[clave];

/**
 * Timeout de las llamadas cortas al servicio Python. Por defecto 5 s; en un plan gratuito de
 * Render el servicio se duerme tras 15 minutos sin uso y tarda cerca de un minuto en despertar,
 * por eso se puede subir con PYTHON_TIMEOUT_MS. Un valor invalido vuelve al defecto.
 */
export function timeoutPythonMs(leer: Lector = desdeEntorno): number {
  const valor = Number(leer('PYTHON_TIMEOUT_MS'));
  return Number.isInteger(valor) && valor > 0 ? valor : TIMEOUT_PYTHON_POR_DEFECTO_MS;
}

/** Opciones de axios hacia el servicio Python: URL base, timeout y clave de servicio si existe. */
export function opcionesHttpPython(leer: Lector = desdeEntorno) {
  const clave = leer('PYTHON_SERVICE_KEY');
  return {
    baseURL: leer('PYTHON_SERVICE_URL'),
    timeout: timeoutPythonMs(leer),
    ...(clave ? { headers: { [CABECERA_CLAVE_SERVICIO]: clave } } : {}),
  };
}
