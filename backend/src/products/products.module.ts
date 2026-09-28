import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './entities/producto.entity';
import { PrecioSupermercado } from './entities/precio-supermercado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, PrecioSupermercado])],
  exports: [TypeOrmModule],
})
export class ProductsModule {}
