import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LIMITE_ACTUALIZAR_PRECIOS } from '../rate-limit';
import { TIENDAS } from '../python-client/scrape.types';
import { CATALOGO } from './catalogo';
import { CompareQueryDto } from './dto/compare-query.dto';
import { LimitQueryDto } from './dto/limit-query.dto';
import { RefreshPricesDto } from './dto/refresh-prices.dto';
import { PricesService } from './prices.service';

@ApiTags('prices')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token de acceso o no es válido' })
@ApiBadRequestResponse({ description: 'Los datos enviados no son válidos' })
@UseGuards(JwtAuthGuard)
@Controller('prices')
export class PricesController {
  constructor(private readonly prices: PricesService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Términos del catálogo que se buscan en cada tienda' })
  catalog() {
    return CATALOGO;
  }

  @Post('refresh')
  @Throttle({ default: LIMITE_ACTUALIZAR_PRECIOS })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Inicia la actualización de precios (segundo plano)',
    description:
      'Crea una ejecución por tienda y responde de inmediato. Consultar el avance en ' +
      'GET /prices/runs/{id}. Responde 409 si ya hay una en curso y 429 si hubo una exitosa hace poco.',
  })
  refresh(@Body() dto: RefreshPricesDto) {
    return this.prices.iniciarActualizacion(dto.tiendas ?? [...TIENDAS]);
  }

  @Get('runs')
  @ApiOperation({ summary: 'Últimas ejecuciones de actualización' })
  runs(@Query() query: LimitQueryDto) {
    return this.prices.listarEjecuciones(query.limite ?? 10);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Estado y métricas de una ejecución' })
  run(@Param('id', ParseUUIDPipe) id: string) {
    return this.prices.obtenerEjecucion(id);
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Compara Jumbo y Santa Isabel',
    description:
      'Mejor producto por precio unitario en cada tienda para cada término, más los ' +
      'productos idénticos presentes en ambas tiendas. Indica la fecha de cada precio.',
  })
  compare(@Query() query: CompareQueryDto) {
    return this.prices.comparar(query.terminos, query.limiteComunes ?? 20);
  }

  @Get('quality')
  @ApiOperation({
    summary: 'Métricas de calidad de los datos recuperados',
    description:
      'Porcentaje de registros válidos, duplicados y descartados, tasa de errores, tiempos, ' +
      'actualidad y cobertura del catálogo, por tienda.',
  })
  quality() {
    return this.prices.calidad();
  }
}
