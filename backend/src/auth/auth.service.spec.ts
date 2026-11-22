// bcrypt real, pero con compare observable para comprobar que siempre se ejecuta.
jest.mock('bcrypt', () => {
  const real = jest.requireActual<typeof import('bcrypt')>('bcrypt');
  return { ...real, compare: jest.fn(real.compare) };
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { BCRYPT_RONDAS } from './auth.constants';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('signed-token'),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
  });

  describe('register', () => {
    it('lanza ConflictException si el email ya existe', async () => {
      usersService.findByEmail.mockResolvedValue({ id: '1' } as User);

      await expect(
        authService.register({ email: 'a@a.com', password: '123456', name: 'A' }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea el usuario con la contraseña hasheada y retorna un token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash: 'hashed',
        name: 'A',
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: 'a@a.com',
        password: '123456',
        name: 'A',
      });

      const createdArg = usersService.create.mock.calls[0][0];
      expect(createdArg.email).toBe('a@a.com');
      expect(createdArg.passwordHash).not.toBe('123456');
      // El costo del hash es el configurado (12 rondas), no el valor por defecto antiguo.
      expect(bcrypt.getRounds(createdArg.passwordHash)).toBe(BCRYPT_RONDAS);
      expect(result).toEqual({ accessToken: 'signed-token' });
    });
  });

  describe('login', () => {
    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(authService.login({ email: 'a@a.com', password: '123456' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('responde igual si el correo no existe o si la contraseña es incorrecta (sin enumeración)', async () => {
      const passwordHash = await bcrypt.hash('correcta', 4);
      usersService.findByEmail.mockResolvedValueOnce(null);
      const sinUsuario = await authService
        .login({ email: 'x@a.com', password: 'cualquiera1' })
        .catch((e: UnauthorizedException) => e);
      usersService.findByEmail.mockResolvedValueOnce({ id: '1', passwordHash } as User);
      const conUsuario = await authService
        .login({ email: 'a@a.com', password: 'incorrecta1' })
        .catch((e: UnauthorizedException) => e);

      expect(sinUsuario).toBeInstanceOf(UnauthorizedException);
      expect((sinUsuario as UnauthorizedException).getResponse()).toEqual(
        (conUsuario as UnauthorizedException).getResponse(),
      );
    });

    it('compara contra un hash señuelo cuando el correo no existe, para igualar el tiempo', async () => {
      const comparar = bcrypt.compare as unknown as jest.Mock;
      comparar.mockClear();
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        authService.login({ email: 'x@a.com', password: 'cualquiera1' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(comparar).toHaveBeenCalledTimes(1);
    });

    it('lanza UnauthorizedException si la contraseña no coincide', async () => {
      const passwordHash = await bcrypt.hash('correcta', 10);
      usersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash,
        name: 'A',
        createdAt: new Date(),
      });

      await expect(
        authService.login({ email: 'a@a.com', password: 'incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('retorna un token si las credenciales son correctas', async () => {
      const passwordHash = await bcrypt.hash('correcta', 10);
      usersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash,
        name: 'A',
        createdAt: new Date(),
      });

      const result = await authService.login({ email: 'a@a.com', password: 'correcta' });
      expect(result).toEqual({ accessToken: 'signed-token' });
    });
  });
});
