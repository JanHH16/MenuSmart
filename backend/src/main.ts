import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { StructuredLogger } from './observability/structured-logger';
import { configureApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new StructuredLogger());
  configureApp(app);

  const documentacion = new DocumentBuilder()
    .setTitle('MenuSmart API')
    .setDescription(
      'API principal de MenuSmart: autenticación, normalización de ingredientes y ' +
        'comparación de precios entre supermercados.',
    )
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, documentacion));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
