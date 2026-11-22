import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ListaCompra } from './lista-compra.entity';
import { Producto } from '../../products/entities/producto.entity';

@Entity('lista_compra_items')
export class ListaCompraItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ListaCompra, (listaCompra) => listaCompra.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listaCompraId' })
  listaCompra: ListaCompra;

  @Column()
  listaCompraId: string;

  @Column()
  nombreNormalizado: string;

  @Column('float')
  cantidadTotal: number;

  @Column()
  unidad: string;

  /** Termino del catalogo de precios al que se mapeo el ingrediente (null si no hubo). */
  @Column({ type: 'varchar', nullable: true })
  terminoCatalogo: string | null;

  @Column({ type: 'varchar', nullable: true })
  categoria: string | null;

  @Column({ default: false })
  comprado: boolean;

  /** Reglas de normalizacion aplicadas, para explicarle al usuario como se llego a la cantidad. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  reglas: string[];

  /** Nombres tal como los escribio el usuario en cada comida. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  nombresOriginales: string[];

  @ManyToOne(() => Producto, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto | null;

  @Column({ nullable: true })
  productoId: string | null;
}
