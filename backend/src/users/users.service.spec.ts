import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('busca un usuario por email', async () => {
    const user = { id: '1', email: 'a@a.com' } as User;
    repository.findOne.mockResolvedValue(user);

    const result = await service.findByEmail('a@a.com');

    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(result).toEqual(user);
  });

  it('crea un usuario nuevo', async () => {
    const data = { email: 'a@a.com', passwordHash: 'hash', name: 'A' };
    const created = { id: '1', ...data, createdAt: new Date() } as User;
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    const result = await service.create(data);

    expect(repository.create).toHaveBeenCalledWith(data);
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  describe('obtenerPerfil', () => {
    it('devuelve solo los datos visibles, sin el hash de la contraseña', async () => {
      const createdAt = new Date();
      repository.findOne.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        name: 'A',
        passwordHash: 'hash-secreto',
        createdAt,
      } as User);

      const perfil = await service.obtenerPerfil('1');

      expect(perfil).toEqual({ id: '1', email: 'a@a.com', name: 'A', createdAt });
      expect(JSON.stringify(perfil)).not.toContain('hash-secreto');
    });

    it('lanza NotFoundException si el usuario ya no existe', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.obtenerPerfil('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('eliminarCuenta', () => {
    it('borra al usuario si la contraseña coincide', async () => {
      const passwordHash = await bcrypt.hash('correcta1', 4);
      repository.findOne.mockResolvedValue({ id: '1', passwordHash } as User);

      await service.eliminarCuenta('1', 'correcta1');

      expect(repository.delete).toHaveBeenCalledWith({ id: '1' });
    });

    it('lanza ForbiddenException y no borra si la contraseña no coincide', async () => {
      const passwordHash = await bcrypt.hash('correcta1', 4);
      repository.findOne.mockResolvedValue({ id: '1', passwordHash } as User);

      await expect(service.eliminarCuenta('1', 'incorrecta1')).rejects.toThrow(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.eliminarCuenta('1', 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
