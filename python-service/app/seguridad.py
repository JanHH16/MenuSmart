"""Autenticacion de servicio a servicio: solo el backend (NestJS) puede llamar a este servicio.

Cuando el servicio no es privado (por ejemplo en un plan gratuito de Render, que no ofrece
servicios privados), la variable de entorno SERVICE_API_KEY activa una clave compartida que el
backend envia en la cabecera X-Service-Key. Sin la variable no se exige nada (desarrollo local y
Docker Compose, donde el servicio solo es alcanzable dentro de la red privada).
"""

import hmac
import os

from fastapi import Header, HTTPException, status

CABECERA_CLAVE = "X-Service-Key"


def exigir_clave_de_servicio(
    x_service_key: str | None = Header(default=None, alias=CABECERA_CLAVE),
) -> None:
    """Dependencia de FastAPI: rechaza con 401 si la clave falta o no coincide.

    Se lee la variable en cada llamada para poder activarla o cambiarla sin reiniciar las pruebas.
    La comparacion es de tiempo constante para no filtrar la clave por diferencias de tiempo.
    """
    esperada = os.getenv("SERVICE_API_KEY", "")
    if not esperada:
        return
    recibida = x_service_key or ""
    if not hmac.compare_digest(recibida.encode(), esperada.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clave de servicio invalida o ausente.",
        )
