import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index, Unique } from 'typeorm';
import { PrecioSupermercado } from './precio-supermercado.entity';

@Entity('productos')
@Unique('UQ_productos_slug', ['slug'])
@Index('IDX_productos_nombre_normalizado', ['nombreNormalizado'])
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Identificador externo: slug de la URL del producto, igual en Jumbo y Santa Isabel. */
  @Column({ type: 'varchar', nullable: true })
  slug: string | null;

  @Column()
  nombreNormalizado: string;

  @Column({ type: 'varchar', nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', nullable: true })
  marca: string | null;

  @Column()
  categoria: string;

  @Column({ type: 'varchar', nullable: true })
  imagenUrl: string | null;

  /** Cantidad del envase en unidad base (kg, l o un). */
  @Column({ type: 'float', nullable: true })
  cantidad: number | null;

  @Column({ type: 'varchar', nullable: true })
  unidad: string | null;

  @OneToMany(() => PrecioSupermercado, (precio) => precio.producto)
  precios: PrecioSupermercado[];
}
