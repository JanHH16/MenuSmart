import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comida } from './entities/comida.entity';
import { Ingrediente } from './entities/ingrediente.entity';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comida, Ingrediente])],
  controllers: [MealsController],
  providers: [MealsService],
  exports: [TypeOrmModule, MealsService],
})
export class MealsModule {}
