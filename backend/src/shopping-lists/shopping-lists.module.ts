import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealsModule } from '../meals/meals.module';
import { PricesModule } from '../prices/prices.module';
import { PythonClientModule } from '../python-client/python-client.module';
import { ListaCompra } from './entities/lista-compra.entity';
import { ListaCompraItem } from './entities/lista-compra-item.entity';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListaCompra, ListaCompraItem]),
    MealsModule,
    PricesModule,
    PythonClientModule,
  ],
  controllers: [ShoppingListsController],
  providers: [ShoppingListsService],
  exports: [TypeOrmModule, ShoppingListsService],
})
export class ShoppingListsModule {}
