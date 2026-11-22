import { IsBoolean, IsOptional, Matches } from 'class-validator';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class GenerarListaDto {
  /** Cualquier fecha (AAAA-MM-DD) dentro de la semana. Si falta, se usa la semana actual. */
  @IsOptional()
  @Matches(FECHA, { message: 'semana debe tener el formato AAAA-MM-DD' })
  semana?: string;
}

export class MarcarCompradoDto {
  @IsBoolean()
  comprado: boolean;
}
