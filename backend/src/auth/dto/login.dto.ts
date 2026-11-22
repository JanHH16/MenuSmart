import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizarEmail } from './credentials';

export class LoginDto {
  @ApiProperty({ example: 'ana@correo.cl' })
  @NormalizarEmail()
  @IsEmail()
  @MaxLength(254)
  email: string;

  // Sin politica de contrasena aqui: cuentas antiguas pueden tener contrasenas mas cortas.
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
