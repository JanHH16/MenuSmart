import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsuarioActual } from '../common/current-user.decorator';
import {
  AceptarRecomendacionDto,
  RechazarRecomendacionDto,
  RecomendacionesQueryDto,
} from './dto/recommendation.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token de acceso o no es válido' })
@ApiBadRequestResponse({ description: 'Los datos enviados no son válidos' })
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recomendaciones: RecommendationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Recetas sugeridas para la semana, con la explicación de cada una',
    description:
      'Ordena por costo por porción y por reutilización de los ingredientes ya planificados. ' +
      '`pesoCosto` (0 a 100) fija la importancia del costo; `excluir` oculta recetas con esos ' +
      'ingredientes; `adaptativo=false` devuelve el orden base alfabético, sin adaptación.',
  })
  recomendar(@UsuarioActual() usuarioId: string, @Query() consulta: RecomendacionesQueryDto) {
    return this.recomendaciones.recomendar(usuarioId, consulta);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Acepta una sugerencia: la agrega al plan de la semana' })
  aceptar(@UsuarioActual() usuarioId: string, @Body() dto: AceptarRecomendacionDto) {
    return this.recomendaciones.aceptar(usuarioId, dto);
  }

  @Post('reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rechaza una sugerencia: deja de mostrarse' })
  async rechazar(@UsuarioActual() usuarioId: string, @Body() dto: RechazarRecomendacionDto) {
    await this.recomendaciones.rechazar(usuarioId, dto.recetaId);
  }

  @Delete('feedback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vuelve a mostrar las sugerencias que se habían rechazado' })
  async restablecer(@UsuarioActual() usuarioId: string) {
    await this.recomendaciones.restablecerRechazos(usuarioId);
  }
}
