import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LIMITE_LOGIN, LIMITE_REGISTRO } from '../rate-limit';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: LIMITE_REGISTRO })
  @ApiOperation({ summary: 'Crea una cuenta y entrega un token de acceso' })
  @ApiBadRequestResponse({ description: 'Datos inválidos (contraseña de 8 a 72 caracteres con letra y número)' })
  @ApiConflictResponse({ description: 'Ya existe una cuenta con ese correo' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados registros desde la misma dirección' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: LIMITE_LOGIN })
  @ApiOperation({ summary: 'Inicia sesión y entrega un token de acceso' })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos desde la misma dirección' })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
