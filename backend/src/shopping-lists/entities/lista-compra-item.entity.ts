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

  @ManyToOne(() => Producto, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto | null;

  @Column({ nullable: true })
  productoId: string | null;
}
