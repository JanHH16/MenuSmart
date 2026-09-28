# Base de datos PostgreSQL administrada. Plan "free" para el ambiente de
# staging: sin costo, suficiente para el volumen de datos de este proyecto.
resource "render_postgres" "menusmart" {
  name    = "menusmart-${var.environment}-db"
  plan    = "free"
  region  = var.region
  version = "16"

  database_name = "menusmart"
  database_user = "menusmart"
}
