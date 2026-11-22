import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Raw, Repository } from 'typeorm';
import { ProfileDto } from './dto/profile.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Compara sin distinguir mayusculas: las cuentas creadas antes de normalizar el correo
   * pueden tener mayusculas guardadas y deben seguir pudiendo entrar.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: Raw((columna) => `LOWER(${columna}) = LOWER(:email)`, { email }) },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(data: { email: string; passwordHash: string; name: string }): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async obtenerPerfil(id: string): Promise<ProfileDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  }

  /**
   * Borra la cuenta tras verificar la contrasena actual. Las comidas, ingredientes y listas
   * de compra se eliminan por las claves foraneas ON DELETE CASCADE definidas en las entidades.
   */
  async eliminarCuenta(id: string, password: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    // 403 y no 401: el front cierra la sesion ante un 401, y aqui el token es valido.
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new ForbiddenException('La contraseña no coincide');
    }
    await this.usersRepository.delete({ id });
  }
}
