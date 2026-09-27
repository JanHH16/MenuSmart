variable "render_api_key" {
  description = "API key de Render (Dashboard > Account Settings > API Keys). Nunca hardcodear ni commitear."
  type        = string
  sensitive   = true
}

variable "render_owner_id" {
  description = "ID del owner (usuario o equipo) dueno de los recursos. Formato usr-xxxx (personal) o tea-xxxx (equipo)."
  type        = string
}

variable "environment" {
  description = "Nombre del ambiente que se esta desplegando (staging, production, etc.)."
  type        = string
  default     = "staging"
}

variable "region" {
  description = "Region de Render donde se despliegan los servicios."
  type        = string
  default     = "oregon"
}

variable "repo_url" {
  description = "URL del repositorio Git del proyecto."
  type        = string
  default     = "https://github.com/JanHH16/MenuSmart"
}

variable "branch" {
  description = "Rama del repositorio que Render debe desplegar."
  type        = string
  default     = "develop"
}

variable "jwt_secret" {
  description = "Secreto usado por el backend para firmar los JWT en este ambiente."
  type        = string
  sensitive   = true
}
