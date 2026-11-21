import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { PythonClientService } from './python-client.service';

const respuestaValida = {
  tienda: 'jumbo',
  estado: 'ok',
  obtenido_en: '2026-11-21T20:00:00Z',
  resultados: [],
  errores: [],
  estadisticas: {
    consultas_total: 1,
    consultas_ok: 1,
    consultas_fallidas: 0,
    registros_extraidos: 0,
    registros_validos: 0,
    registros_duplicados: 0,
    registros_descartados: 0,
    descartes_por_motivo: {},
    duracion_ms: 10,
  },
};

const ok = (data: unknown) => of({ data } as AxiosResponse);
const sinRespuesta = () => throwError(() => new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED'));
const conError = (status: number, data: unknown) =>
  throwError(
    () =>
      new AxiosError('fallo', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status,
        data,
      } as AxiosResponse),
  );

describe('PythonClientService.scrapeSearch', () => {
  let servicio: PythonClientService;
  let post: jest.Mock;
  const peticion = { tienda: 'jumbo' as const, consultas: ['arroz'] };
  const opciones = { retryDelayMs: 0 };

  beforeEach(async () => {
    post = jest.fn();
    const modulo = await Test.createTestingModule({
      providers: [PythonClientService, { provide: HttpService, useValue: { post } }],
    }).compile();
    servicio = modulo.get(PythonClientService);
  });

  it('devuelve la respuesta validada', async () => {
    post.mockReturnValue(ok(respuestaValida));
    const { response, invalidos } = await servicio.scrapeSearch(peticion, opciones);
    expect(response.tienda).toBe('jumbo');
    expect(invalidos).toBe(0);
    expect(post).toHaveBeenCalledWith('/scrape/search', peticion, { timeout: 120_000 });
  });

  it('reintenta una vez cuando no hay respuesta y se recupera', async () => {
    post.mockReturnValueOnce(sinRespuesta()).mockReturnValueOnce(ok(respuestaValida));
    const { response } = await servicio.scrapeSearch(peticion, opciones);
    expect(response.estado).toBe('ok');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('lanza ServiceUnavailable al agotar los reintentos', async () => {
    post.mockReturnValue(sinRespuesta());
    await expect(servicio.scrapeSearch(peticion, { ...opciones, retries: 2 })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('no reintenta si Python respondió con error y propaga su estado', async () => {
    post.mockReturnValue(conError(422, { detail: 'consultas inválidas' }));
    const error = await servicio.scrapeSearch(peticion, opciones).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(422);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('lanza BadGateway sin reintentar si la respuesta no cumple el contrato', async () => {
    post.mockReturnValue(ok({ cualquier: 'cosa' }));
    await expect(servicio.scrapeSearch(peticion, opciones)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(post).toHaveBeenCalledTimes(1);
  });
});
