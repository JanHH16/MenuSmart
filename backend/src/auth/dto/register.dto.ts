import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { NormalizarEmail, QuitarEspacios } from './credentials';

export class RegisterDto {
  @ApiProperty({ example: 'ana@correo.cl' })
  @NormalizarEmail()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    description: 'Entre 8 y 72 caracteres, con al menos una letra y un número',
  })
  @IsString()
  @MinLength(8)
  // bcrypt solo usa los primeros 72 bytes: se rechaza lo que pasaria inadvertido.
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: 'password debe incluir al menos una letra' })
  @Matches(/\d/, { message: 'password debe incluir al menos un número' })
  password: string;

  @ApiProperty({ example: 'Ana' })
  @QuitarEspacios()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
