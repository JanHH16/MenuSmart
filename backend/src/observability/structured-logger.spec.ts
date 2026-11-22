import { conContextoDeSolicitud } from './request-context';
import { StructuredLogger } from './structured-logger';

describe('StructuredLogger', () => {
  let salida: string[];
  let errores: string[];

  beforeEach(() => {
    salida = [];
    errores = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((texto) => {
      salida.push(String(texto));
      return true;
    });
    jest.spyOn(process.stderr, 'write').mockImplementation((texto) => {
      errores.push(String(texto));
      return true;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('escribe una línea JSON con nivel, servicio y contexto', () => {
    new StructuredLogger('log').log('hola', 'PricesService');
    expect(JSON.parse(salida[0])).toMatchObject({
      level: 'info',
      service: 'menusmart-backend',
      context: 'PricesService',
      msg: 'hola',
    });
  });

  it('incluye el id de la solicitud en curso', () => {
    conContextoDeSolicitud('req-1', () => new StructuredLogger('log').log('dentro'));
    expect(JSON.parse(salida[0])).toMatchObject({ requestId: 'req-1' });
  });

  it('agrega los campos de un mensaje objeto', () => {
    new StructuredLogger('log').warn({ msg: 'error_fuente_externa', tienda: 'jumbo' }, 'X');
    expect(JSON.parse(salida[0])).toMatchObject({
      level: 'warn',
      msg: 'error_fuente_externa',
      tienda: 'jumbo',
    });
  });

  it('manda los errores a stderr con su traza', () => {
    new StructuredLogger('log').error('falló', 'traza...', 'PricesService');
    expect(salida).toHaveLength(0);
    expect(JSON.parse(errores[0])).toMatchObject({
      level: 'error',
      stack: 'traza...',
      context: 'PricesService',
    });
  });

  it('respeta el nivel mínimo', () => {
    new StructuredLogger('warn').log('no debería salir');
    expect(salida).toHaveLength(0);
  });
});
