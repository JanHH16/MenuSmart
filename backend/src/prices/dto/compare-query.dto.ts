import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TERMINOS } from '../catalogo';

export class CompareQueryDto {
  /** Términos del catálogo separados por coma. Si se omite, se comparan todos. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((termino) => termino.trim().toLowerCase())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsIn(TERMINOS, { each: true })
  terminos?: string[];

  /** Máximo de productos idénticos en ambas tiendas a devolver. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limiteComunes?: number;
}
