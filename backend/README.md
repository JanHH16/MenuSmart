# MenuSmart: Backend (NestJS)

API principal del proyecto MenuSmart. Ver el [README general del proyecto](../README.md)
para la descripción completa, arquitectura y guía de instalación con Docker Compose.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar valores, especialmente JWT_SECRET
npm run start:dev
```

Requiere PostgreSQL corriendo (ver `docker-compose.yml` en la raíz del proyecto) y el
servicio Python disponible en `PYTHON_SERVICE_URL` para los endpoints que dependen de él.

## Scripts

- `npm run start:dev`: modo desarrollo con recarga automática
- `npm run test`: pruebas unitarias
- `npm run test:e2e`: pruebas de integración
- `npm run lint`: análisis estático (oxlint)
