import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { EjecucionScraping } from '../../prices/entities/ejecucion-scraping.entity';
import { Producto } from './producto.entity';

/** Un producto tiene como máximo un precio por tienda y por día (la actualización es idempotente). */
@Entity('precios_supermercado')
@Index('IDX_precios_tienda_producto_dia', ['supermercado', 'productoId', 'fechaDia'], {
  unique: true,
})
@Index('IDX_precios_consulta', ['consulta'])
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

  @Column({ type: 'timestamptz' })
  fechaObtencion: Date;

  @Column({ type: 'date' })
  fechaDia: string;

  /** Término del catálogo con el que se encontró el producto. */
  @Column()
  consulta: string;

  @Column({ type: 'int', nullable: true })
  precioUnitario: number | null;

  @Column({ default: true })
  disponible: boolean;

  @Column({ type: 'varchar', nullable: true })
  urlProducto: string | null;

  @ManyToOne(() => EjecucionScraping, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ejecucionId', foreignKeyConstraintName: 'FK_precios_ejecucion' })
  ejecucion: EjecucionScraping | null;

  @Column({ type: 'uuid', nullable: true })
  ejecucionId: string | null;
}
