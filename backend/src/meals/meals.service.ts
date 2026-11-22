import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { esFechaISOValida, hoyISO, indiceDia, lunesDe } from '../common/semana';
import { ActualizarComidaDto, CrearComidaDto, IngredienteDto } from './dto/meal.dto';
import { Comida } from './entities/comida.entity';
import { Ingrediente } from './entities/ingrediente.entity';

/** Resuelve la semana pedida (cualquier fecha dentro de ella) a su lunes. */
export function semanaDe(fecha?: string): string {
  const base = fecha ?? hoyISO();
  if (!esFechaISOValida(base)) {
    throw new BadRequestException('semana debe ser una fecha valida (AAAA-MM-DD)');
  }
  return lunesDe(base);
}

/**
 * Comidas del plan semanal. Todas las operaciones se limitan al usuario autenticado: una
 * comida ajena responde 404 (no 403) para no revelar que existe.
 */
@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(Comida) private readonly comidas: Repository<Comida>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listar(usuarioId: string, semana?: string): Promise<Comida[]> {
    const lunes = semanaDe(semana);
    const comidas = await this.comidas.find({
      where: { usuarioId, semana: lunes },
      relations: { ingredientes: true },
      order: { createdAt: 'ASC' },
    });
    return comidas.sort((a, b) => indiceDia(a.diaSemana) - indiceDia(b.diaSemana));
  }

  async obtener(usuarioId: string, id: string): Promise<Comida> {
    const comida = await this.comidas.findOne({
      where: { id, usuarioId },
      relations: { ingredientes: true },
    });
    if (!comida) throw new NotFoundException('La comida no existe.');
    return comida;
  }

  async crear(usuarioId: string, dto: CrearComidaDto): Promise<Comida> {
    const semana = semanaDe(dto.semana);
    const id = await this.dataSource.transaction(async (manager) => {
      const comida = await manager.save(
        manager.create(Comida, {
          usuarioId,
          nombre: dto.nombre,
          tipo: dto.tipo,
          diaSemana: dto.diaSemana,
          semana,
          porciones: dto.porciones ?? 1,
          notas: dto.notas ?? null,
        }),
      );
      await this.guardarIngredientes(manager, comida.id, dto.ingredientes);
      return comida.id;
    });
    return this.obtener(usuarioId, id);
  }

  async actualizar(usuarioId: string, id: string, dto: ActualizarComidaDto): Promise<Comida> {
    await this.obtener(usuarioId, id); // 404 si no existe o no es del usuario
    await this.dataSource.transaction(async (manager) => {
      const { ingredientes, ...campos } = dto;
      const hayCampos = Object.values(campos).some((valor) => valor !== undefined);
      if (hayCampos) {
        await manager.update(Comida, { id, usuarioId }, campos);
      }
      if (ingredientes) {
        await manager.delete(Ingrediente, { comidaId: id });
        await this.guardarIngredientes(manager, id, ingredientes);
      }
    });
    return this.obtener(usuarioId, id);
  }

  async eliminar(usuarioId: string, id: string): Promise<void> {
    const resultado = await this.comidas.delete({ id, usuarioId });
    if (!resultado.affected) throw new NotFoundException('La comida no existe.');
  }

  private async guardarIngredientes(
    manager: DataSource['manager'],
    comidaId: string,
    ingredientes: IngredienteDto[],
  ): Promise<void> {
    if (ingredientes.length === 0) return;
    await manager.insert(
      Ingrediente,
      ingredientes.map((ingrediente) => ({ comidaId, ...ingrediente })),
    );
  }
}
