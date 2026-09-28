import { Module } from '@nestjs/common';
import { PythonClientModule } from '../python-client/python-client.module';
import { IngredientsController } from './ingredients.controller';

@Module({
  imports: [PythonClientModule],
  controllers: [IngredientsController],
})
export class IngredientsModule {}
