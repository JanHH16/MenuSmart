import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StructuredLogger } from './observability/structured-logger';
import { configureApp } from './setup-app';
import { configurarSwagger } from './setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new StructuredLogger());
  configureApp(app);
  configurarSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
