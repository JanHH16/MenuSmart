# Los tres servicios usan auto_deploy = false a proposito: el despliegue lo
# dispara el pipeline de GitHub Actions (job deploy-staging) solo despues de que
# pasan las pruebas, y apuntando a un commit exacto. Con auto_deploy = true Render
# desplegaria en cada push sin esperar al CI. Ver docs/pipeline-y-staging.md.
#
# Plan de las instancias (var.instance_plan): por defecto "free". Un servicio gratuito se
# duerme tras 15 minutos sin trafico y tarda cerca de un minuto en despertar; para una demo en
# vivo conviene "despertarlos" antes (ver docs/pipeline-y-staging.md). Con "starter" no se duermen.

# Servicio Python (FastAPI). El plan gratuito de Render no ofrece servicios privados, asi que es
# un servicio web con URL publica. Para que el enunciado se siga cumpliendo (solo NestJS puede
# usarlo), exige una clave compartida en la cabecera X-Service-Key (SERVICE_API_KEY): sin ella
# responde 401 en todo salvo /health. El frontend nunca lo llama. Ver ADR-001 (actualizado).
resource "render_web_service" "python_service" {
  name   = "menusmart-${var.environment}-python"
  plan   = var.instance_plan
  region = var.region

  runtime_source = {
    docker = {
      repo_url        = var.repo_url
      branch          = var.branch
      dockerfile_path = "python-service/Dockerfile"
      context         = "python-service"
      auto_deploy     = false
    }
  }

  health_check_path = "/health"

  env_vars = {
    PORT            = { value = local.python_port }
    SERVICE_API_KEY = { value = var.python_service_key }
  }
}

# Backend NestJS: unico punto de entrada de la API, publico.
resource "render_web_service" "backend" {
  name   = "menusmart-${var.environment}-backend"
  plan   = var.instance_plan
  region = var.region

  runtime_source = {
    docker = {
      repo_url        = var.repo_url
      branch          = var.branch
      dockerfile_path = "backend/Dockerfile"
      context         = "backend"
      auto_deploy     = false
    }
  }

  # El health check de Render solo exige HTTP 200. El pipeline hace ademas una
  # verificacion estricta (status "ok" con PostgreSQL y Python) despues del deploy.
  health_check_path = "/health"

  env_vars = {
    PORT           = { value = "3000" }
    NODE_ENV       = { value = "production" }
    DATABASE_URL   = { value = render_postgres.menusmart.connection_info.internal_connection_string }
    JWT_SECRET     = { value = var.jwt_secret }
    JWT_EXPIRES_IN = { value = "3600s" }
    # URL publica del servicio Python (https) y la clave que este exige.
    PYTHON_SERVICE_URL = { value = render_web_service.python_service.url }
    PYTHON_SERVICE_KEY = { value = var.python_service_key }
    # Un servicio gratuito dormido tarda cerca de 1 minuto en despertar: un timeout corto
    # haria fallar la primera llamada. Con "starter" (siempre despierto) basta el valor por defecto.
    PYTHON_TIMEOUT_MS = { value = var.instance_plan == "free" ? "90000" : "5000" }
  }
}

# Frontend (Angular + nginx): sirve el sitio y hace de proxy de /api/ hacia el
# backend. nginx lee BACKEND_URL al arrancar (plantilla envsubst, ver
# frontend/nginx.conf.template). Se usa la URL publica del backend: es el
# destino cuya resolucion esta garantizada entre servicios web de Render.
resource "render_web_service" "frontend" {
  name   = "menusmart-${var.environment}-frontend"
  plan   = var.instance_plan
  region = var.region

  runtime_source = {
    docker = {
      repo_url        = var.repo_url
      branch          = var.branch
      dockerfile_path = "frontend/Dockerfile"
      context         = "frontend"
      auto_deploy     = false
    }
  }

  env_vars = {
    # nginx escucha en el puerto 80 (EXPOSE 80 del Dockerfile); Render lo usa
    # para enrutar el trafico, por defecto asumiria 10000.
    PORT        = { value = "80" }
    BACKEND_URL = { value = render_web_service.backend.url }
  }
}
