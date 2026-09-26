import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
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
