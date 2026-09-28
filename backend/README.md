# MenuSmart: Backend (NestJS)

API principal del proyecto MenuSmart. Ver el [README general del proyecto](../README.md)
para la descripción completa, arquitectura y guía de instalación con Docker Compose.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar valores, especialmente JWT_SECRET
npm run start:dev
```

Requiere PostgreSQL corriendo. Sin levantar todo Docker Compose, basta con
`docker compose up -d database` desde la raíz del proyecto (queda en `localhost:5433`,
usar `DATABASE_HOST=localhost` y `DATABASE_PORT=5433` en `.env`). También requiere el
servicio Python disponible en `PYTHON_SERVICE_URL` para los endpoints que dependen de él
(ver [README general](../README.md#desarrollo-local-sin-docker) para levantarlo solo).

## Scripts

- `npm run start:dev`: modo desarrollo con recarga automática
- `npm run test`: pruebas unitarias
- `npm run test:e2e`: pruebas de integración
- `npm run lint`: análisis estático (oxlint)
