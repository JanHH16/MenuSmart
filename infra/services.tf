# Servicio Python (FastAPI): privado a proposito. El enunciado del curso exige
# que el frontend nunca lo llame directo, solo NestJS puede hacerlo (seccion 3).
# render_private_service no expone URL publica, solo alcanzable por otros
# servicios del mismo proyecto/region.
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
      auto_deploy     = true
    }
  }

  env_vars = {
    PORT = { value = "8000" }
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
      auto_deploy     = true
    }
  }

  health_check_path = "/health"

  env_vars = {
    PORT               = { value = "3000" }
    NODE_ENV           = { value = "production" }
    DATABASE_URL       = { value = render_postgres.menusmart.connection_info.internal_connection_string }
    JWT_SECRET         = { value = var.jwt_secret }
    JWT_EXPIRES_IN     = { value = "3600s" }
    PYTHON_SERVICE_URL = { value = render_private_service.python_service.url }
  }
}

# Frontend (Angular + nginx): sirve el sitio y hace de proxy hacia el backend.
# TODO: nginx.conf hoy resuelve el backend como "http://backend:3000" (nombre
# de servicio de Docker Compose). Ese hostname no existe en la red de Render;
# hay que verificar con una cuenta real como Render resuelve el backend desde
# el frontend (URL publica del backend, o red privada equivalente) y
# parametrizar nginx.conf en vez de dejarlo hardcodeado. Pendiente, no bloquea
# la EP1 (que solo pide fmt/validate/plan, no un despliegue real todavia).
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
      auto_deploy     = true
    }
  }
}
