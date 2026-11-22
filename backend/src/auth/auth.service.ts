import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { BCRYPT_RONDAS } from './auth.constants';

// Hash de una contraseña inexistente: sirve para gastar el mismo tiempo cuando el correo no
// existe y asi el tiempo de respuesta no delata que cuentas estan registradas.
const HASH_SENUELO = bcrypt.hashSync('contraseña-senuelo-sin-uso', BCRYPT_RONDAS);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_RONDAS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });
    return this.buildToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    // Siempre se compara, exista o no el usuario, y el mensaje es el mismo en ambos casos.
    const passwordMatches = await bcrypt.compare(dto.password, user?.passwordHash ?? HASH_SENUELO);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.buildToken(user.id, user.email);
  }

  private buildToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
