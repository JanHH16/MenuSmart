/**
 * Integracion NestJS <-> FastAPI con el servicio Python REAL sobre HTTP.
 *
 * Requiere el servicio Python levantado en PYTHON_SERVICE_URL (por defecto
 * http://127.0.0.1:8000) con el servidor de integracion, que sirve los fixtures
 * de las tiendas en vez de acceder a internet:
 *
 *   cd python-service && uvicorn tests.servidor_integracion:app --port 8000
 *
 * No necesita base de datos. Se ejecuta con:
 *
 *   npx jest --config ./test/jest-integration.json
 *
 * Valida el contrato real (cliente HttpService + parseScrapeResponse) y la
 * recuperacion ante fallos parciales y servicio caido.
 */
import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { PythonClientService } from './../src/python-client/python-client.service';

const URL_PYTHON = process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8000';

const crearCliente = (baseURL: string) =>
  new PythonClientService(new HttpService(axios.create({ baseURL, timeout: 5000 })));

describe('Integracion NestJS <-> servicio Python real', () => {
  const cliente = crearCliente(URL_PYTHON);

  it('el servicio Python responde /health', async () => {
    const respuesta = await axios.get<{ status: string; service: string }>(`${URL_PYTHON}/health`);
    expect(respuesta.status).toBe(200);
    expect(respuesta.data).toMatchObject({ status: 'ok', service: 'menusmart-python-service' });
  });

  it('normaliza ingredientes sumando los repetidos (contrato de /ingredients/normalize)', async () => {
    const respuesta = await cliente.normalizeIngredients([
      { name: 'Arroz ', quantity: 200, unit: 'g' },
      { name: 'arroz', quantity: 300, unit: 'G' },
      { name: 'Leche', quantity: 1, unit: 'l' },
    ]);
    expect(respuesta.original_count).toBe(3);
    expect(respuesta.normalized_count).toBe(2);
    // Normalizacion v2: los gramos se llevan a kg y cada linea indica las reglas aplicadas.
    expect(respuesta.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'arroz',
          quantity: 0.5,
          unit: 'kg',
          term: 'arroz',
          merged_lines: 2,
          rules: expect.arrayContaining(['unidad:g->kg(x0.001)']),
        }),
      ]),
    );
  });

  it.each(['jumbo', 'santa_isabel'] as const)(
    'la busqueda en %s cumple el contrato que valida NestJS (0 registros invalidos)',
    async (tienda) => {
      const { response, invalidos } = await cliente.scrapeSearch(
        { tienda, consultas: ['arroz'], max_resultados_por_consulta: 5 },
        { retries: 0 },
      );
      expect(invalidos).toBe(0);
      expect(response.tienda).toBe(tienda);
      expect(response.estado).toBe('ok');
      expect(response.errores).toEqual([]);
      expect(response.resultados).toHaveLength(5);
      expect(response.resultados.every((p) => p.moneda === 'CLP' && p.precio > 0)).toBe(true);
      expect(response.estadisticas).toMatchObject({
        consultas_total: 1,
        consultas_ok: 1,
        consultas_fallidas: 0,
        registros_validos: 5,
      });
    },
  );

  it('recuperacion: si una consulta falla, Python devuelve estado parcial y conserva las demas', async () => {
    const { response } = await cliente.scrapeSearch(
      { tienda: 'jumbo', consultas: ['arroz', 'malo'], max_resultados_por_consulta: 3 },
      { retries: 0 },
    );
    expect(response.estado).toBe('parcial');
    expect(response.resultados).toHaveLength(3);
    expect(response.errores).toHaveLength(1);
    expect(response.errores[0]).toMatchObject({ consulta: 'malo', tipo: 'estructura' });
  });

  it('recuperacion: si la tienda cae (503), el error se reporta sin tumbar la respuesta', async () => {
    const { response } = await cliente.scrapeSearch(
      { tienda: 'jumbo', consultas: ['caida'] },
      { retries: 0 },
    );
    expect(response.estado).toBe('fallido');
    expect(response.resultados).toEqual([]);
    expect(response.errores[0]).toMatchObject({ consulta: 'caida', tipo: 'http' });
  });

  it('rechaza solicitudes invalidas propagando el 422 real de FastAPI', async () => {
    await expect(
      cliente.scrapeSearch({ tienda: 'jumbo', consultas: [] }, { retries: 0 }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('recuperacion: con el servicio Python caido, NestJS responde 503 en vez de colgarse', async () => {
    const sinServicio = crearCliente('http://127.0.0.1:1');
    await expect(
      sinServicio.scrapeSearch(
        { tienda: 'jumbo', consultas: ['arroz'] },
        { retries: 1, retryDelayMs: 10, timeoutMs: 2000 },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(sinServicio.normalizeIngredients([])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
