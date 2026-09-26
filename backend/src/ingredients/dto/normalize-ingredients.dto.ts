import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsPositive, IsString, MinLength, ValidateNested } from 'class-validator';

const trimIfString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

class RawIngredientDto {
  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  name: string;

  @IsPositive()
  quantity: number;

  @Transform(trimIfString)
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
