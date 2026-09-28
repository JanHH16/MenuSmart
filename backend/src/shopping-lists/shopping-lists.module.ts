import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListaCompra } from './entities/lista-compra.entity';
import { ListaCompraItem } from './entities/lista-compra-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ListaCompra, ListaCompraItem])],
  exports: [TypeOrmModule],
})
export class ShoppingListsModule {}
