import { LoggerService, LogLevel } from '@nestjs/common';
import { obtenerRequestId } from './request-context';

const NIVELES: Record<string, number> = { verbose: 0, debug: 1, log: 2, warn: 3, error: 4, fatal: 5 };

/**
 * Logger de Nest que escribe una linea JSON por registro, con el id de la solicitud en curso.
 * Si el mensaje es un objeto, sus campos se agregan a la linea (`msg` es el texto principal).
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
    salida.write(`${JSON.stringify(linea)}\n`);
  }
}
