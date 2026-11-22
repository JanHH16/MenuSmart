import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DIAS_SEMANA } from '../../common/semana';
import { TERMINOS } from '../../prices/catalogo';
import { RECETAS } from '../recetas';

const TIPOS = ['desayuno', 'almuerzo', 'cena'] as const;
const IDS_RECETA = RECETAS.map((receta) => receta.id);

const aListaMinuscula = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((parte) => parte.trim().toLowerCase())
        .filter(Boolean)
    : value;

const aBooleano = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class RecomendacionesQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'semana debe tener el formato AAAA-MM-DD' })
  semana?: string;

  /** Importancia del costo frente a la reutilización de ingredientes (0 a 100). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(0)
  @Max(100)
  pesoCosto?: number;

  /** Ingredientes que el usuario no quiere ver, separados por coma (del catálogo). */
  @IsOptional()
  @Transform(aListaMinuscula)
  @IsArray()
  @ArrayMaxSize(TERMINOS.length)
  @IsIn(TERMINOS, { each: true })
  excluir?: string[];

  @IsOptional()
  @IsIn(TIPOS)
  tipo?: (typeof TIPOS)[number];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsInt()
  @Min(1)
  @Max(30)
  limite?: number;

  /** false devuelve el orden base (alfabético), sin adaptación. */
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  adaptativo?: boolean;
}

export class AceptarRecomendacionDto {
  @IsIn(IDS_RECETA)
  recetaId: string;

  @IsIn(DIAS_SEMANA)
  diaSemana: (typeof DIAS_SEMANA)[number];

  @IsOptional()
  @IsIn(TIPOS)
  tipo?: (typeof TIPOS)[number];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'semana debe tener el formato AAAA-MM-DD' })
  semana?: string;
}

export class RechazarRecomendacionDto {
  @IsString()
  @IsIn(IDS_RECETA)
  recetaId: string;
}
