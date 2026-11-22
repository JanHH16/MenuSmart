import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const RUTA_DOCS = 'api/docs';

/** Documentacion OpenAPI. Vive aparte de main.ts para poder probarla junto a las cabeceras. */
export function configurarSwagger(app: INestApplication): void {
  const documentacion = new DocumentBuilder()
    .setTitle('MenuSmart API')
    .setDescription(
      'API principal de MenuSmart: autenticación, normalización de ingredientes y ' +
        'comparación de precios entre supermercados.',
    )
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(RUTA_DOCS, app, SwaggerModule.createDocument(app, documentacion));
}
