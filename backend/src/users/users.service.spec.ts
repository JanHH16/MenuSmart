import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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

    expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'a@a.com' } });
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
});
