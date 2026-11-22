import { AsyncLocalStorage } from 'node:async_hooks';

interface ContextoSolicitud {
  requestId: string;
}

const almacen = new AsyncLocalStorage<ContextoSolicitud>();

/** Ejecuta `fn` con el id de la solicitud disponible para todo lo que ella dispare. */
export function conContextoDeSolicitud<T>(requestId: string, fn: () => T): T {
  return almacen.run({ requestId }, fn);
}

/** Id de la solicitud en curso, o undefined fuera de una solicitud (arranque, pruebas). */
export function obtenerRequestId(): string | undefined {
  return almacen.getStore()?.requestId;
}
