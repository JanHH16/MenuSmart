import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PythonClientService } from './python-client.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('PYTHON_SERVICE_URL'),
        timeout: 5000,
      }),
    }),
  ],
  providers: [PythonClientService],
  exports: [PythonClientService],
})
export class PythonClientModule {}
