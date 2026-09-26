import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('PYTHON_SERVICE_URL'),
        timeout: 2000,
      }),
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
