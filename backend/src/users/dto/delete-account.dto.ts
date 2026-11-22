import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Contraseña actual: confirma que quien borra la cuenta es su dueño' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
