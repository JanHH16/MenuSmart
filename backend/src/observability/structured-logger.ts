import { LoggerService, LogLevel } from '@nestjs/common';
import { obtenerRequestId } from './request-context';

const NIVELES: Record<string, number> = { verbose: 0, debug: 1, log: 2, warn: 3, error: 4, fatal: 5 };

export const REDACTADO = '[REDACTED]';
const PROFUNDIDAD_MAXIMA = 8;
// Cualquier clave que contenga uno de estos fragmentos (sin distinguir mayusculas) se oculta:
// password, passwordHash, token, accessToken, authorization, secret, cookie, set-cookie, etc.
const CLAVE_SENSIBLE = /password|passwd|token|secret|authorization|cookie|api[_-]?key/i;
// Credenciales que se cuelan dentro de un texto libre (ej. el mensaje de una excepcion).
const TEXTO_SENSIBLE = /Bearer\s+[\w.~+/=-]+|eyJ[\w-]+\.[\w-]+\.[\w-]*/g;

/**
 * Copia `valor` reemplazando por "[REDACTED]" los campos sensibles, en profundidad, y tacha
 * los tokens Bearer y JWT que aparezcan dentro de textos. No modifica el original y tolera
 * referencias circulares.
 */
export function redactar(valor: unknown, profundidad = 0, vistos = new WeakSet<object>()): unknown {
  if (typeof valor === 'string') return valor.replace(TEXTO_SENSIBLE, REDACTADO);
  if (typeof valor !== 'object' || valor === null) return valor;
  if (profundidad > PROFUNDIDAD_MAXIMA) return REDACTADO;
  if (vistos.has(valor)) return '[Circular]';
  vistos.add(valor);

  if (valor instanceof Error) {
    return redactar(
      { name: valor.name, message: valor.message, stack: valor.stack },
      profundidad + 1,
      vistos,
    );
  }
  const serializable = valor as { toJSON?: () => unknown };
  if (typeof serializable.toJSON === 'function') {
    return redactar(serializable.toJSON(), profundidad + 1, vistos);
  }
  if (Array.isArray(valor)) {
    return valor.map((item) => redactar(item, profundidad + 1, vistos));
  }
  return Object.fromEntries(
    Object.entries(valor).map(([clave, contenido]) => [
      clave,
      CLAVE_SENSIBLE.test(clave) ? REDACTADO : redactar(contenido, profundidad + 1, vistos),
    ]),
  );
}

/**
 * Logger de Nest que escribe una linea JSON por registro, con el id de la solicitud en curso.
 * Si el mensaje es un objeto, sus campos se agregan a la linea (`msg` es el texto principal).
 * Toda linea pasa por `redactar`: nunca se escriben contrasenas, tokens ni cabeceras de sesion.
 */
export class StructuredLogger implements LoggerService {
  private readonly minimo: number;

  constructor(nivelMinimo: string = process.env.LOG_LEVEL ?? 'log') {
    this.minimo = NIVELES[nivelMinimo.toLowerCase()] ?? NIVELES.log;
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    this.escribir('log', message, optionalParams);
  }
  error(message: unknown, ...optionalParams: unknown[]) {
    this.escribir('error', message, optionalParams);
  }
  warn(message: unknown, ...optionalParams: unknown[]) {
    this.escribir('warn', message, optionalParams);
  }
  debug(message: unknown, ...optionalParams: unknown[]) {
    this.escribir('debug', message, optionalParams);
  }
  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.escribir('verbose', message, optionalParams);
  }
  fatal(message: unknown, ...optionalParams: unknown[]) {
    this.escribir('fatal', message, optionalParams);
  }
  setLogLevels?(_levels: LogLevel[]) {
    // El nivel se controla con LOG_LEVEL.
  }

  private escribir(nivel: string, message: unknown, optionalParams: unknown[]) {
    if (NIVELES[nivel] < this.minimo) return;

    // Nest agrega el nombre de la clase como ultimo parametro (y, en errores, la traza antes).
    const textos = optionalParams.filter((p): p is string => typeof p === 'string');
    const contexto = textos.length > 0 ? textos[textos.length - 1] : undefined;
    const traza = nivel === 'error' && textos.length > 1 ? textos[0] : undefined;

    const base =
      typeof message === 'object' && message !== null
        ? (message as Record<string, unknown>)
        : { msg: String(message) };

    const linea = {
      time: new Date().toISOString(),
      level: nivel === 'log' ? 'info' : nivel,
      service: 'menusmart-backend',
      context: contexto,
      requestId: obtenerRequestId(),
      ...base,
      ...(traza ? { stack: traza } : {}),
    };
    const salida = nivel === 'error' || nivel === 'fatal' ? process.stderr : process.stdout;
    salida.write(`${JSON.stringify(redactar(linea))}\n`);
  }
}
