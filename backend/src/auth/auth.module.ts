import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JWT_ALGORITMO, JWT_EXPIRACION_POR_DEFECTO } from './auth.constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error(
            'JWT_SECRET no está configurado. Defínelo en el archivo .env antes de iniciar el backend.',
          );
        }
        return {
          secret,
          signOptions: {
            algorithm: JWT_ALGORITMO,
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
              JWT_EXPIRACION_POR_DEFECTO) as unknown as number,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
