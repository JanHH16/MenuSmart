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
import { ListaCompraItem } from './lista-compra-item.entity';

@Entity('listas_compra')
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
