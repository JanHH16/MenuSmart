import {
  Body,
  Controller,
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsuarioActual } from '../common/current-user.decorator';
import { SemanaQueryDto } from '../meals/dto/meal.dto';
import { GenerarListaDto, MarcarCompradoDto } from './dto/shopping-list.dto';
import { ShoppingListsService } from './shopping-lists.service';

@ApiTags('shopping-lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping-lists')
export class ShoppingListsController {
  constructor(private readonly listas: ShoppingListsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Genera la lista de compras de la semana a partir del plan',
    description:
      'Normaliza y suma los ingredientes de las comidas (servicio Python) y reemplaza la lista ' +
      'anterior de esa semana. Conserva lo ya marcado como comprado.',
  })
  generar(@UsuarioActual() usuarioId: string, @Body() dto: GenerarListaDto) {
    return this.listas.generar(usuarioId, dto.semana);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista de compras de la semana con el costo estimado en cada supermercado',
    description:
      'Los totales por tienda solo suman los items con precio en ambas tiendas; los demás ' +
      'indican el motivo por el que no se pudieron valorizar.',
  })
  obtener(@UsuarioActual() usuarioId: string, @Query() query: SemanaQueryDto) {
    return this.listas.obtener(usuarioId, query.semana);
  }

  @Patch('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca o desmarca un item como comprado' })
  async marcarComprado(
    @UsuarioActual() usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarcarCompradoDto,
  ) {
    await this.listas.marcarComprado(usuarioId, id, dto.comprado);
  }
}
