import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DIAS_SEMANA } from '../../common/semana';

export const TIPOS_COMIDA = ['desayuno', 'almuerzo', 'cena', 'colacion'] as const;

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class IngredienteDto {
  @Transform(recortar)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(100000)
  cantidad: number;

  @Transform(recortar)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unidad: string;
}

export class CrearComidaDto {
  @Transform(recortar)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nombre: string;

  @IsIn(TIPOS_COMIDA)
  tipo: (typeof TIPOS_COMIDA)[number];

  @IsIn(DIAS_SEMANA)
  diaSemana: (typeof DIAS_SEMANA)[number];

  /** Cualquier fecha (AAAA-MM-DD) dentro de la semana. Si falta, se usa la semana actual. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'semana debe tener el formato AAAA-MM-DD' })
  semana?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  porciones?: number;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(500)
  notas?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => IngredienteDto)
  ingredientes: IngredienteDto[];
}

/** En PATCH todo es opcional; si llegan `ingredientes`, reemplazan a los actuales. */
export class ActualizarComidaDto {
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsIn(TIPOS_COMIDA)
  tipo?: (typeof TIPOS_COMIDA)[number];

  @IsOptional()
  @IsIn(DIAS_SEMANA)
  diaSemana?: (typeof DIAS_SEMANA)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  porciones?: number;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(500)
  notas?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => IngredienteDto)
  ingredientes?: IngredienteDto[];
}

export class SemanaQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'semana debe tener el formato AAAA-MM-DD' })
  semana?: string;
}
