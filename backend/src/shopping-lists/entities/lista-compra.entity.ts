import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ListaCompraItem } from './lista-compra-item.entity';

@Entity('listas_compra')
@Unique('UQ_listas_compra_usuario_semana', ['usuarioId', 'semana'])
export class ListaCompra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  usuarioId: string;

  @Column({ type: 'date' })
  semana: string;

  @OneToMany(() => ListaCompraItem, (item) => item.listaCompra)
  items: ListaCompraItem[];

  @CreateDateColumn()
  createdAt: Date;
}
