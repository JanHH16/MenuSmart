output "backend_url" {
  description = "URL publica del backend NestJS."
  value       = render_web_service.backend.url
}

output "frontend_url" {
  description = "URL publica del frontend."
  value       = render_web_service.frontend.url
}

output "database_internal_connection_string" {
  description = "Connection string interna de PostgreSQL (solo alcanzable desde servicios de Render en la misma region)."
  value       = render_postgres.menusmart.connection_info.internal_connection_string
  sensitive   = true
}
