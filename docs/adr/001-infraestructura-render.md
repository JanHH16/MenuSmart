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
  Python"). *Reemplazado el 22-11-2026 por un servicio web con clave de servicio: ver la
  actualización más abajo.*
- `render_web_service` (runtime Docker) para **backend** y **frontend**: cada uno usa
  directamente el `Dockerfile` que ya existe en su carpeta (sin duplicar configuración).

## Consecuencias

- `terraform fmt`, `terraform init` y `terraform validate` corren limpio localmente.
- `terraform plan` (creación desde cero) también corre limpio **sin necesitar credenciales
  reales de Render**. Terraform no necesita autenticarse contra la API para planificar
  recursos que aún no existen, solo para leer/aplicar contra recursos reales.
- `terraform apply` no se ha ejecutado. Requiere una cuenta real de Render con API key,
  y aplicar cambios de infraestructura debe hacerse de forma controlada (sección 9 del
  enunciado), no como parte de esta entrega preliminar.

## Actualización (2026-11-22): staging en plan gratuito y servicio Python con clave de servicio

El plan gratuito de Render no ofrece servicios privados (`render_private_service` exige un plan de
pago) y, como el objetivo de este ambiente es presentar un prototipo, se eligió no pagar. Cambios:

- **Todas las instancias en plan `free`** (variable `instance_plan`, que también admite `starter`).
  Un servicio gratuito se duerme tras 15 minutos sin tráfico y tarda cerca de un minuto en
  despertar; antes de una demostración hay que "despertarlos" (ver `docs/pipeline-y-staging.md`).
  La base de datos gratuita de Render caduca a los 30 días.
- **El servicio Python pasa a `render_web_service`**, con URL pública. Para seguir cumpliendo la
  sección 3 del enunciado (solo NestJS usa el servicio Python), este exige una **clave compartida**
  en la cabecera `X-Service-Key` (`SERVICE_API_KEY`): sin ella responde 401 en todas las rutas salvo
  `/health`. El frontend nunca lo llama. El backend envía la clave (`PYTHON_SERVICE_KEY`).
- **Riesgo aceptado:** la URL de Python queda expuesta en internet y su protección depende de que
  la clave se mantenga secreta (se compara en tiempo constante y no se escribe en los logs). Con
  un plan de pago se vuelve a `render_private_service` y se puede quitar la clave.
- El backend sube su timeout hacia Python (`PYTHON_TIMEOUT_MS=90000`) mientras las instancias sean
  gratuitas, para tolerar el despertar.

## Actualización (Fase 5, 2026-11-21)

Dos puntos de esta decisión cambiaron al construir el despliegue automático. El detalle
operativo está en [`docs/pipeline-y-staging.md`](../pipeline-y-staging.md).

- **Proxy del frontend resuelto.** `frontend/nginx.conf` pasó a ser una plantilla
  (`nginx.conf.template`) que lee `BACKEND_URL` al arrancar. En Docker Compose vale
  `http://backend:3000`; en Render es la URL pública del backend, que Terraform inyecta.
  Deja de estar pendiente el hostname hardcodeado.
- **`auto_deploy = false` en los tres servicios.** Antes Render desplegaba por su cuenta en
  cada push. Ahora el único camino a staging es el job `deploy-staging` del CI, que
  despliega después de que pasan las pruebas y a un commit exacto, y permite rollback por
  SHA. Render sigue siendo la plataforma; solo cambia quién dispara el despliegue.
