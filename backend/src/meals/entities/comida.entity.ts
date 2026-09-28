import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ingrediente } from './ingrediente.entity';

@Entity('comidas')
export class Comida {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  usuarioId: string;

  @Column()
  nombre: string;

  @Column()
  diaSemana: string;

  @OneToMany(() => Ingrediente, (ingrediente) => ingrediente.comida)
  ingredientes: Ingrediente[];

  @CreateDateColumn()
  createdAt: Date;
}
