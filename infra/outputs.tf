output "backend_url" {
  description = "URL publica del backend NestJS (variable STAGING_BACKEND_URL del environment staging en GitHub)."
  value       = render_web_service.backend.url
}

output "frontend_url" {
  description = "URL publica del frontend (variable STAGING_FRONTEND_URL del environment staging en GitHub)."
  value       = render_web_service.frontend.url
}

output "python_service_url" {
  description = "URL publica del servicio Python (variable opcional STAGING_PYTHON_URL en GitHub). Exige la clave X-Service-Key salvo en /health."
  value       = render_web_service.python_service.url
}

output "render_service_id_backend" {
  description = "ID del servicio backend (variable RENDER_SERVICE_ID_BACKEND en GitHub)."
  value       = render_web_service.backend.id
}

output "render_service_id_frontend" {
  description = "ID del servicio frontend (variable RENDER_SERVICE_ID_FRONTEND en GitHub)."
  value       = render_web_service.frontend.id
}

output "render_service_id_python" {
  description = "ID del servicio Python (variable RENDER_SERVICE_ID_PYTHON en GitHub)."
  value       = render_web_service.python_service.id
}

output "database_internal_connection_string" {
  description = "Connection string interna de PostgreSQL (solo alcanzable desde servicios de Render en la misma region)."
  value       = render_postgres.menusmart.connection_info.internal_connection_string
  sensitive   = true
}
