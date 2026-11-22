# Los tres servicios usan auto_deploy = false a proposito: el despliegue lo
# dispara el pipeline de GitHub Actions (job deploy-staging) solo despues de que
# pasan las pruebas, y apuntando a un commit exacto. Con auto_deploy = true Render
# desplegaria en cada push sin esperar al CI. Ver docs/pipeline-y-staging.md.

# Servicio Python (FastAPI): privado a proposito. El enunciado del curso exige
# que el frontend nunca lo llame directo, solo NestJS puede hacerlo (seccion 3).
# render_private_service no expone URL publica, solo es alcanzable por otros
# servicios de la misma region/cuenta, usando su nombre (slug) como host.
resource "render_private_service" "python_service" {
  name   = "menusmart-${var.environment}-python"
  plan   = "starter"
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

  env_vars = {
    PORT = { value = local.python_port }
  }
}

# Backend NestJS: unico punto de entrada de la API, publico.
resource "render_web_service" "backend" {
  name   = "menusmart-${var.environment}-backend"
  plan   = "starter"
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
    # Red privada de Render: el host es el nombre del servicio Python.
    PYTHON_SERVICE_URL = { value = "http://${render_private_service.python_service.slug}:${local.python_port}" }
  }
}

# Frontend (Angular + nginx): sirve el sitio y hace de proxy de /api/ hacia el
# backend. nginx lee BACKEND_URL al arrancar (plantilla envsubst, ver
# frontend/nginx.conf.template). Se usa la URL publica del backend: es el
# destino cuya resolucion esta garantizada entre servicios web de Render.
resource "render_web_service" "frontend" {
  name   = "menusmart-${var.environment}-frontend"
  plan   = "starter"
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
