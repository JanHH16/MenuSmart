"""Observabilidad inicial: logs JSON con id de solicitud y metricas de tiempo de respuesta.

Todo vive en memoria y se reinicia con el proceso. Es suficiente para el diagnostico basico
de esta etapa; una metrica persistente (Prometheus, etc.) queda como trabajo futuro.
"""

import json
import logging
import os
import re
import statistics
import sys
import time
import uuid
from collections import Counter, deque
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_VALIDO = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
_RUTAS_SILENCIOSAS = {"/health", "/metrics"}
_MUESTRAS_POR_RUTA = 500

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


def id_de_solicitud(valor_recibido: str | None) -> str:
    """Reutiliza el id que manda el llamador (NestJS) si es seguro; si no, genera uno."""
    if valor_recibido and _REQUEST_ID_VALIDO.match(valor_recibido):
        return valor_recibido
    return uuid.uuid4().hex


class JsonFormatter(logging.Formatter):
    """Una linea JSON por registro, con el id de la solicitud en curso si existe."""

    def format(self, record: logging.LogRecord) -> str:
        datos: dict[str, Any] = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname.lower(),
            "service": "menusmart-python-service",
            "logger": record.name,
            "msg": record.getMessage(),
        }
        request_id = request_id_var.get()
        if request_id:
            datos["requestId"] = request_id
        datos.update(getattr(record, "campos", {}))
        if record.exc_info:
            datos["error"] = self.formatException(record.exc_info)
        return json.dumps(datos, ensure_ascii=False, default=str)


def configure_logging() -> None:
    """Deja el logging raiz en JSON hacia stdout. Es idempotente."""
    raiz = logging.getLogger()
    if any(isinstance(h.formatter, JsonFormatter) for h in raiz.handlers):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    raiz.handlers = [handler]
    raiz.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())


def percentil(muestras: list[float], p: float) -> float:
    if not muestras:
        return 0.0
    ordenadas = sorted(muestras)
    indice = min(len(ordenadas) - 1, max(0, round(p / 100 * len(ordenadas)) - 1))
    return ordenadas[indice]


class MetricsRegistry:
    """Contadores y tiempos de respuesta por ruta, mas errores de la fuente externa."""

    def __init__(self) -> None:
        self.iniciado_en = datetime.now(UTC)
        self._rutas: dict[str, dict[str, Any]] = {}
        self._scrapes: dict[str, dict[str, Any]] = {}

    def registrar_solicitud(self, metodo: str, ruta: str, status: int, segundos: float) -> None:
        clave = f"{metodo} {ruta}"
        datos = self._rutas.setdefault(
            clave,
            {"total": 0, "errores": 0, "muestras_ms": deque(maxlen=_MUESTRAS_POR_RUTA)},
        )
        datos["total"] += 1
        if status >= 500:
            datos["errores"] += 1
        datos["muestras_ms"].append(segundos * 1000)

    def registrar_scrape(
        self, tienda: str, estado: str, duracion_ms: float, errores_por_tipo: Counter[str]
    ) -> None:
        datos = self._scrapes.setdefault(
            tienda,
            {"corridas": 0, "por_estado": Counter(), "errores": Counter(), "duracion_ms": []},
        )
        datos["corridas"] += 1
        datos["por_estado"][estado] += 1
        datos["errores"].update(errores_por_tipo)
        datos["duracion_ms"].append(duracion_ms)

    def snapshot(self) -> dict[str, Any]:
        rutas = []
        for clave, datos in sorted(self._rutas.items()):
            muestras = list(datos["muestras_ms"])
            rutas.append(
                {
                    "ruta": clave,
                    "solicitudes": datos["total"],
                    "errores5xx": datos["errores"],
                    "promedioMs": round(statistics.fmean(muestras), 2),
                    "p50Ms": round(percentil(muestras, 50), 2),
                    "p95Ms": round(percentil(muestras, 95), 2),
                }
            )
        fuente = {
            tienda: {
                "corridas": datos["corridas"],
                "porEstado": dict(datos["por_estado"]),
                "erroresPorTipo": dict(datos["errores"]),
                "duracionPromedioMs": round(statistics.fmean(datos["duracion_ms"]), 2),
            }
            for tienda, datos in sorted(self._scrapes.items())
        }
        return {
            "servicio": "menusmart-python-service",
            "iniciadoEn": self.iniciado_en.isoformat(),
            "solicitudesTotal": sum(r["solicitudes"] for r in rutas),
            "rutas": rutas,
            "fuenteExterna": fuente,
        }


class ObservabilityMiddleware:
    """ASGI puro: asigna id de solicitud, lo devuelve en la cabecera, lo loguea y lo mide."""

    def __init__(self, app: ASGIApp, metrics: MetricsRegistry) -> None:
        self.app = app
        self.metrics = metrics
        self.logger = logging.getLogger("menusmart.http")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = id_de_solicitud(Headers(scope=scope).get(REQUEST_ID_HEADER))
        token = request_id_var.set(request_id)
        inicio = time.perf_counter()
        status = 500

        async def send_con_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_con_id)
        finally:
            segundos = time.perf_counter() - inicio
            ruta = getattr(scope.get("route"), "path", None) or "(sin ruta)"
            self.metrics.registrar_solicitud(scope["method"], ruta, status, segundos)
            nivel = logging.DEBUG if scope["path"] in _RUTAS_SILENCIOSAS else logging.INFO
            self.logger.log(
                nivel,
                "http_request",
                extra={
                    "campos": {
                        "method": scope["method"],
                        "path": scope["path"],
                        "status": status,
                        "durationMs": round(segundos * 1000, 2),
                    }
                },
            )
            request_id_var.reset(token)
