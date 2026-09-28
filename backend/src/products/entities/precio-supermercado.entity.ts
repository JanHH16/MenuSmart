import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Producto } from './producto.entity';

@Entity('precios_supermercado')
export class PrecioSupermercado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Producto, (producto) => producto.precios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column()
  productoId: string;

  @Column()
  supermercado: string;

  @Column('float')
  precio: number;

  @Column({ type: 'timestamp' })
  fechaObtencion: Date;
}
