import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PythonClientService } from '../python-client/python-client.service';
import { NormalizeIngredientsDto } from './dto/normalize-ingredients.dto';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly pythonClientService: PythonClientService) {}

  @UseGuards(JwtAuthGuard)
  @Post('normalize')
  normalize(@Body() dto: NormalizeIngredientsDto) {
    return this.pythonClientService.normalizeIngredients(dto.ingredients);
  }
}
