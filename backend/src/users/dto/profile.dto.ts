import { ApiProperty } from '@nestjs/swagger';

/** Perfil visible para el propio usuario. Nunca incluye el hash de la contraseña. */
export class ProfileDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;
}
