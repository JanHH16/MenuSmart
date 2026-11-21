import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PythonClientModule } from '../python-client/python-client.module';
import { EjecucionScraping } from './entities/ejecucion-scraping.entity';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

@Module({
  imports: [TypeOrmModule.forFeature([EjecucionScraping]), PythonClientModule],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
