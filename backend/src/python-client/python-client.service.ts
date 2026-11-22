import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, isAxiosError } from 'axios';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { InvalidScrapeResponseError, parseScrapeResponse } from './scrape-response';
import { ScrapeSearchOptions, ScrapeSearchRequest, ScrapeSearchResult } from './scrape.types';

const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface RawIngredientInput {
  name: string;
  quantity: number;
  unit: string;
}

export interface NormalizedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface NormalizeResponse {
  items: NormalizedIngredient[];
  original_count: number;
  normalized_count: number;
}

@Injectable()
export class PythonClientService {
  private readonly logger = new Logger(PythonClientService.name);

  constructor(private readonly httpService: HttpService) {}

  async normalizeIngredients(ingredients: RawIngredientInput[]): Promise<NormalizeResponse> {
    const request$ = this.httpService
      .post<NormalizeResponse>('/ingredients/normalize', { ingredients })
      .pipe(
        timeout(5000),
        catchError((error: AxiosError) => {
          if (error.response) {
            // Python respondió (validación inválida, error interno, etc.): no es
            // indisponibilidad, hay que propagar el error real en vez de ocultarlo.
            this.logger.warn(
              `El servicio Python respondió con error ${error.response.status}: ${JSON.stringify(error.response.data)}`,
            );
            throw new HttpException(
              error.response.data ?? 'Error en el servicio de procesamiento de ingredientes',
              error.response.status,
            );
          }
          // Sin respuesta (timeout, conexión rechazada): esto sí es indisponibilidad real.
          this.logger.error(`Fallo al comunicarse con el servicio Python: ${error.message}`);
          throw new ServiceUnavailableException(
            'El servicio de procesamiento de ingredientes no está disponible en este momento.',
          );
        }),
      );

    const response = await firstValueFrom(request$);
    return response.data;
  }

  /**
   * Pide al servicio Python buscar precios en una tienda. Reintenta de forma limitada solo
   * cuando no hubo respuesta (servicio caído o timeout); si Python respondió con error o con
   * una respuesta que no cumple el contrato, no reintenta y lo informa.
   */
  async scrapeSearch(
    request: ScrapeSearchRequest,
    options: ScrapeSearchOptions = {},
  ): Promise<ScrapeSearchResult> {
    const { timeoutMs = 120_000, retries = 1, retryDelayMs = 1000 } = options;

    for (let intento = 0; ; intento++) {
      try {
        const response = await firstValueFrom(
          this.httpService
            .post<unknown>('/scrape/search', request, { timeout: timeoutMs })
            .pipe(timeout(timeoutMs + 1000)),
        );
        try {
          return parseScrapeResponse(response.data);
        } catch (error) {
          if (error instanceof InvalidScrapeResponseError) {
            this.logger.error(`Respuesta inválida del servicio de precios: ${error.message}`);
            throw new BadGatewayException('El servicio de precios devolvió una respuesta inválida.');
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof HttpException) throw error;
        if (isAxiosError(error) && error.response) {
          this.logger.warn(`El servicio de precios respondió con error ${error.response.status}`);
          throw new HttpException(
            error.response.data ?? 'Error en el servicio de precios',
            error.response.status,
          );
        }
        if (intento < retries) {
          this.logger.warn(`Sin respuesta del servicio de precios, reintentando (${intento + 1})`);
          await esperar(retryDelayMs);
          continue;
        }
        this.logger.error('El servicio de precios no responde');
        throw new ServiceUnavailableException(
          'El servicio de precios no está disponible en este momento.',
        );
      }
    }
  }
}
