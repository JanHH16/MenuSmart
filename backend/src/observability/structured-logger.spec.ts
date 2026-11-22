import { conContextoDeSolicitud } from './request-context';
import { redactar, StructuredLogger } from './structured-logger';

const JWT_FALSO = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.firma_falsa-123';

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

  describe('redacción de secretos', () => {
    const salidaCompleta = () => [...salida, ...errores].join('');

    it('oculta en profundidad contraseñas, tokens y cabeceras de sesión', () => {
      new StructuredLogger('log').log({
        msg: 'intento',
        password: 'secreto123',
        passwordHash: '$2b$10$abcdef',
        accessToken: 'tok-abc',
        Authorization: 'Bearer tok-abc',
        usuario: { email: 'a@a.cl', cookie: 'sid=1', historial: [{ secret: 's3' }] },
        tienda: 'jumbo',
      });
      const texto = salidaCompleta();
      for (const secreto of ['secreto123', '$2b$10$abcdef', 'tok-abc', 'sid=1', 's3"']) {
        expect(texto).not.toContain(secreto);
      }
      expect(JSON.parse(salida[0])).toMatchObject({
        password: '[REDACTED]',
        passwordHash: '[REDACTED]',
        accessToken: '[REDACTED]',
        Authorization: '[REDACTED]',
        usuario: { email: 'a@a.cl', cookie: '[REDACTED]', historial: [{ secret: '[REDACTED]' }] },
        tienda: 'jumbo',
      });
    });

    it('oculta cada una de las claves exigidas', () => {
      const claves = ['password', 'passwordHash', 'token', 'accessToken', 'authorization', 'secret', 'cookie'];
      new StructuredLogger('log').log(Object.fromEntries(claves.map((c) => [c, `valor-${c}`])));
      const linea = JSON.parse(salida[0]) as Record<string, unknown>;
      for (const clave of claves) expect(linea[clave]).toBe('[REDACTED]');
    });

    it('tacha tokens Bearer y JWT que aparecen dentro de un texto', () => {
      const logger = new StructuredLogger('log');
      logger.warn(`falló con Authorization: Bearer ${JWT_FALSO} y ${JWT_FALSO}`, 'X');
      logger.error('falló', `Error: token inválido ${JWT_FALSO}
    at ...`, 'X');
      expect(salidaCompleta()).not.toContain('firma_falsa');
      expect(salidaCompleta()).toContain('[REDACTED]');
    });

    it('conserva el mensaje de un Error pero sin sus secretos', () => {
      new StructuredLogger('log').error({ msg: 'fallo', error: new Error(`token ${JWT_FALSO}`) });
      const linea = JSON.parse(errores[0]) as { error: { message: string } };
      expect(linea.error.message).toBe('token [REDACTED]');
    });

    it('no falla con referencias circulares ni con objetos muy profundos', () => {
      const circular: Record<string, unknown> = { nombre: 'a' };
      circular.yo = circular;
      let profundo: Record<string, unknown> = { password: 'x' };
      for (let i = 0; i < 20; i++) profundo = { siguiente: profundo };
      new StructuredLogger('log').log({ msg: 'raro', circular, profundo });
      const texto = salida[0];
      expect(texto).toContain('[Circular]');
      expect(texto).toContain('[REDACTED]');
    });
  });
});

describe('redactar', () => {
  it('no modifica el objeto original', () => {
    const original = { a: { password: 'x' } };
    expect(redactar(original)).toEqual({ a: { password: '[REDACTED]' } });
    expect(original.a.password).toBe('x');
  });

  it('deja intactos los valores simples y las fechas', () => {
    const fecha = new Date('2026-01-01T00:00:00Z');
    expect(redactar({ n: 1, b: true, nulo: null, fecha })).toEqual({
      n: 1,
      b: true,
      nulo: null,
      fecha: fecha.toISOString(),
    });
  });
});
