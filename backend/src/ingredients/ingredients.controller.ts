import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PythonClientService } from '../python-client/python-client.service';
import { NormalizeIngredientsDto } from './dto/normalize-ingredients.dto';

@ApiTags('ingredients')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token de acceso o no es válido' })
@ApiBadRequestResponse({ description: 'Los datos enviados no son válidos' })
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly pythonClientService: PythonClientService) {}

  @UseGuards(JwtAuthGuard)
  @Post('normalize')
  @ApiOperation({
    summary: 'Normaliza ingredientes escritos libremente',
    description:
      'Limpia el nombre, lo mapea a un término del catálogo de precios, convierte las ' +
      'cantidades a kg, l o un y une las líneas repetidas. Cada ítem informa las reglas ' +
      'aplicadas. Lo resuelve el servicio Python.',
  })
  normalize(@Body() dto: NormalizeIngredientsDto) {
    return this.pythonClientService.normalizeIngredients(dto.ingredients);
  }
}
