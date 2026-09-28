# ADR-001: Infraestructura como código con Terraform + Render

**Estado:** Aceptado
**Fecha:** 2026-09-26

## Contexto

El proyecto exige infraestructura definida con Terraform (sección 9) y un ambiente de
staging desplegado automáticamente desde el pipeline (sección 10). La arquitectura consta
de 4 contenedores (frontend, backend, servicio Python, PostgreSQL) ya definidos vía Docker
Compose (ver `docker-compose.yml`).

Se evaluó Vercel (descartado: pensado para sitios estáticos/serverless, no para múltiples
contenedores Docker corriendo juntos) y una VM simple con `docker-compose up` (viable, pero
requiere gestionar el sistema operativo, actualizaciones y seguridad manualmente).

## Decisión

Usar **Render** (`render-oss/render` provider oficial de Terraform) como plataforma de
staging:

- `render_postgres`: base de datos administrada (plan `free`, sin costo para este proyecto).
- `render_private_service` para el **servicio Python**: no expone URL pública, coherente con
  la sección 3 del enunciado ("el frontend no deberá acceder de forma directa al servicio
  Python").
- `render_web_service` (runtime Docker) para **backend** y **frontend**: cada uno usa
  directamente el `Dockerfile` que ya existe en su carpeta (sin duplicar configuración).

## Consecuencias

- `terraform fmt`, `terraform init` y `terraform validate` corren limpio localmente.
- `terraform plan` (creación desde cero) también corre limpio **sin necesitar credenciales
  reales de Render** — Terraform no necesita autenticarse contra la API para planificar
  recursos que aún no existen, solo para leer/aplicar contra recursos reales.
- **Pendiente (no bloqueante para EP1):** `frontend/nginx.conf` resuelve el backend como
  `http://backend:3000`, nombre de servicio válido en Docker Compose pero no en la red de
  Render. Antes de un despliegue real hay que verificar con una cuenta de Render cómo
  resolver el backend desde el frontend (URL pública vs. red privada equivalente) y
  parametrizar `nginx.conf` en lugar de dejarlo hardcodeado.
- `terraform apply` no se ha ejecutado — requiere una cuenta real de Render con API key,
  y aplicar cambios de infraestructura debe hacerse de forma controlada (sección 9 del
  enunciado), no como parte de esta entrega preliminar.
