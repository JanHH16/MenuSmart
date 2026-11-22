import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ConectividadService } from './conectividad.service';

describe('ConectividadService', () => {
  function simularRed(enLinea: boolean): void {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(enLinea);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parte en línea cuando el navegador reporta red', () => {
    simularRed(true);
    const servicio = TestBed.inject(ConectividadService);

    expect(servicio.enLinea()).toBe(true);
    expect(servicio.sinConexion()).toBe(false);
  });

  it('parte sin conexión cuando el navegador no reporta red', () => {
    simularRed(false);
    const servicio = TestBed.inject(ConectividadService);

    expect(servicio.enLinea()).toBe(false);
    expect(servicio.sinConexion()).toBe(true);
  });

  it('reacciona a los eventos offline y online de la ventana', () => {
    simularRed(true);
    const servicio = TestBed.inject(ConectividadService);

    window.dispatchEvent(new Event('offline'));
    expect(servicio.enLinea()).toBe(false);
    expect(servicio.sinConexion()).toBe(true);

    window.dispatchEvent(new Event('online'));
    expect(servicio.enLinea()).toBe(true);
    expect(servicio.sinConexion()).toBe(false);
  });

  it('deja de escuchar la ventana al destruirse el injector', () => {
    simularRed(true);
    const servicio = TestBed.inject(ConectividadService);

    TestBed.resetTestingModule();
    window.dispatchEvent(new Event('offline'));

    expect(servicio.enLinea()).toBe(true);
  });
});
