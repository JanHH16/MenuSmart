import {
  CABECERA_CLAVE_SERVICIO,
  opcionesHttpPython,
  TIMEOUT_PYTHON_POR_DEFECTO_MS,
  timeoutPythonMs,
} from './python-http.config';

const entorno = (valores: Record<string, string>) => (clave: string) => valores[clave];

describe('timeoutPythonMs', () => {
  it('usa 5 segundos si no hay configuracion', () => {
    expect(timeoutPythonMs(entorno({}))).toBe(TIMEOUT_PYTHON_POR_DEFECTO_MS);
  });

  it('usa PYTHON_TIMEOUT_MS cuando es un entero positivo', () => {
    expect(timeoutPythonMs(entorno({ PYTHON_TIMEOUT_MS: '60000' }))).toBe(60000);
  });

  it.each(['abc', '0', '-5', '1.5', ''])('vuelve al defecto con un valor invalido (%p)', (valor) => {
    expect(timeoutPythonMs(entorno({ PYTHON_TIMEOUT_MS: valor }))).toBe(
      TIMEOUT_PYTHON_POR_DEFECTO_MS,
    );
  });
});

describe('opcionesHttpPython', () => {
  it('sin clave no agrega cabeceras', () => {
    const opciones = opcionesHttpPython(entorno({ PYTHON_SERVICE_URL: 'http://localhost:8000' }));
    expect(opciones).toEqual({ baseURL: 'http://localhost:8000', timeout: 5000 });
    expect(opciones).not.toHaveProperty('headers');
  });

  it('con PYTHON_SERVICE_KEY envia la clave en X-Service-Key', () => {
    const opciones = opcionesHttpPython(
      entorno({
        PYTHON_SERVICE_URL: 'https://python.onrender.com',
        PYTHON_SERVICE_KEY: 'secreto',
        PYTHON_TIMEOUT_MS: '60000',
      }),
    );
    expect(opciones.baseURL).toBe('https://python.onrender.com');
    expect(opciones.timeout).toBe(60000);
    expect((opciones as { headers: Record<string, string> }).headers[CABECERA_CLAVE_SERVICIO]).toBe(
      'secreto',
    );
  });

  it('una clave vacia se trata como ausente', () => {
    const opciones = opcionesHttpPython(entorno({ PYTHON_SERVICE_KEY: '' }));
    expect(opciones).not.toHaveProperty('headers');
  });
});
