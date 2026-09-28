import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PrecioSupermercado } from './precio-supermercado.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombreNormalizado: string;

  @Column()
  categoria: string;

  @OneToMany(() => PrecioSupermercado, (precio) => precio.producto)
  precios: PrecioSupermercado[];
}
