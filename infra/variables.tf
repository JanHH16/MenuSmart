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

variable "instance_plan" {
  description = "Plan de las instancias de los tres servicios. \"free\" (sin costo, se duermen tras 15 min sin trafico) o \"starter\" (de pago, siempre despiertos)."
  type        = string
  default     = "free"

  validation {
    condition     = contains(["free", "starter"], var.instance_plan)
    error_message = "instance_plan debe ser \"free\" o \"starter\"."
  }
}

variable "python_service_key" {
  description = "Clave compartida entre el backend y el servicio Python (cabecera X-Service-Key). Debe ser larga y aleatoria."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.python_service_key) >= 24
    error_message = "python_service_key debe tener al menos 24 caracteres."
  }
}

variable "jwt_secret" {
  description = "Secreto usado por el backend para firmar los JWT en este ambiente."
  type        = string
  sensitive   = true
}
