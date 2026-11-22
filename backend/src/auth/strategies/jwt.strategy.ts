import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JWT_ALGORITMO } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      // Fallar rápido: un secreto por defecto sería una credencial insegura
      // incorporada en el código (justo lo que el enunciado prohíbe evitar).
      throw new InternalServerErrorException(
        'JWT_SECRET no está configurado. Defínelo en el archivo .env antes de iniciar el backend.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      // Solo el algoritmo con que se firma: descarta tokens con "alg" distinto o "none".
      algorithms: [JWT_ALGORITMO],
    });
  }

  /**
   * Un token firmado no basta: la cuenta debe seguir existiendo. Así, al borrar la cuenta
   * (DELETE /users/me) sus tokens dejan de servir aunque aún no hayan expirado.
   */
  async validate(payload: { sub: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return { userId: user.id, email: user.email };
  }
}
