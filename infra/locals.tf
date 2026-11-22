locals {
  # Puerto en el que escucha el servicio Python; lo usan el propio servicio
  # (variable PORT) y el backend (PYTHON_SERVICE_URL), asi no se desincronizan.
  python_port = "8000"
}
