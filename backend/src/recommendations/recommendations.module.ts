import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealsModule } from '../meals/meals.module';
import { PricesModule } from '../prices/prices.module';
import { PythonClientModule } from '../python-client/python-client.module';
import { RecomendacionFeedback } from './entities/recomendacion-feedback.entity';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecomendacionFeedback]),
    MealsModule,
    PricesModule,
    PythonClientModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
