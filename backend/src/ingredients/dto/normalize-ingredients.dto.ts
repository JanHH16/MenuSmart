import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsPositive, IsString, MinLength, ValidateNested } from 'class-validator';

class RawIngredientDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsPositive()
  quantity: number;

  @IsString()
  @MinLength(1)
  unit: string;
}

export class NormalizeIngredientsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RawIngredientDto)
  ingredients: RawIngredientDto[];
}
