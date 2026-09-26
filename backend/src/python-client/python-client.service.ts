import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, timeout } from 'rxjs';

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
}
