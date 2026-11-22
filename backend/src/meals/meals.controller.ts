import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsuarioActual } from '../common/current-user.decorator';
import { ActualizarComidaDto, CrearComidaDto, SemanaQueryDto } from './dto/meal.dto';
import { MealsService } from './meals.service';

@ApiTags('meals')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token de acceso o no es válido' })
@ApiBadRequestResponse({ description: 'Los datos enviados no son válidos' })
@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private readonly meals: MealsService) {}

  @Get()
  @ApiOperation({
    summary: 'Comidas del plan semanal del usuario',
    description: 'Sin `semana` devuelve la semana actual; con una fecha, la semana que la contiene.',
  })
  listar(@UsuarioActual() usuarioId: string, @Query() query: SemanaQueryDto) {
    return this.meals.listar(usuarioId, query.semana);
  }

  @Post()
  @ApiOperation({ summary: 'Agrega una comida (con sus ingredientes) al plan semanal' })
  crear(@UsuarioActual() usuarioId: string, @Body() dto: CrearComidaDto) {
    return this.meals.crear(usuarioId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una comida del usuario' })
  obtener(@UsuarioActual() usuarioId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.meals.obtener(usuarioId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifica una comida',
    description: 'Si se envían `ingredientes`, reemplazan a los actuales.',
  })
  actualizar(
    @UsuarioActual() usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarComidaDto,
  ) {
    return this.meals.actualizar(usuarioId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una comida y sus ingredientes' })
  async eliminar(@UsuarioActual() usuarioId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.meals.eliminar(usuarioId, id);
  }
}
