import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from './metrics.service';

@ApiTags('observabilidad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Tiempos de respuesta por ruta y resultado de las actualizaciones de precios',
    description: 'Valores desde el último arranque del servicio (viven en memoria).',
  })
  obtener() {
    return this.metrics.snapshot();
  }
}
