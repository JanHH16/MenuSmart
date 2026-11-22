import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import {ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LIMITE_LOGIN } from '../rate-limit';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ProfileDto } from './dto/profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token de acceso o no es válido' })
@ApiBadRequestResponse({ description: 'Los datos enviados no son válidos' })
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Datos personales que MenuSmart guarda de la cuenta',
    description: 'Correo, nombre y fecha de alta. Nunca incluye la contraseña ni su hash.',
  })
  me(@Request() req: { user: { userId: string } }): Promise<ProfileDto> {
    return this.users.obtenerPerfil(req.user.userId);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Exige la contraseña con un token valido: se limita igual que el login para frenar la fuerza bruta.
  @Throttle({ default: LIMITE_LOGIN })
  @ApiOperation({
    summary: 'Elimina la cuenta y todos sus datos',
    description:
      'Exige la contraseña actual. Borra el usuario y, en cascada, sus comidas, ingredientes ' +
      'y listas de compra. No se puede deshacer; el token deja de servir de inmediato.',
  })
  @ApiForbiddenResponse({ description: 'La contraseña no coincide' })
  async eliminar(
    @Request() req: { user: { userId: string } },
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    await this.users.eliminarCuenta(req.user.userId, dto.password);
  }
}
