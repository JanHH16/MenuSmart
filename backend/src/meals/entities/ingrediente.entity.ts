import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Comida } from './comida.entity';
import { Producto } from '../../products/entities/producto.entity';

@Entity('ingredientes')
export class Ingrediente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Comida, (comida) => comida.ingredientes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comidaId' })
  comida: Comida;

  @Column()
  comidaId: string;

  @Column()
  nombre: string;

  @Column('float')
  cantidad: number;

  @Column()
  unidad: string;

  @ManyToOne(() => Producto, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto | null;

  @Column({ nullable: true })
  productoId: string | null;
}
