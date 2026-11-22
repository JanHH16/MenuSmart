import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PythonClientService } from './python-client.service';
import { opcionesHttpPython } from './python-http.config';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        opcionesHttpPython((clave) => config.get<string>(clave)),
    }),
  ],
  providers: [PythonClientService],
  exports: [PythonClientService],
})
export class PythonClientModule {}
