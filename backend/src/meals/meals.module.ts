import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comida } from './entities/comida.entity';
import { Ingrediente } from './entities/ingrediente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comida, Ingrediente])],
  exports: [TypeOrmModule],
})
export class MealsModule {}
