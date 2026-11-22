import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ingrediente } from './ingrediente.entity';

@Entity('comidas')
@Index('IDX_comidas_usuario_semana', ['usuarioId', 'semana'])
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

  /** desayuno, almuerzo, cena o colacion. */
  @Column({ default: 'almuerzo' })
  tipo: string;

  /** lunes a domingo, sin tildes. */
  @Column()
  diaSemana: string;

  /** Lunes (AAAA-MM-DD) de la semana a la que pertenece la comida. */
  @Column({ type: 'date' })
  semana: string;

  @Column({ type: 'int', default: 1 })
  porciones: number;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @OneToMany(() => Ingrediente, (ingrediente) => ingrediente.comida)
  ingredientes: Ingrediente[];

  @CreateDateColumn()
  createdAt: Date;
}
