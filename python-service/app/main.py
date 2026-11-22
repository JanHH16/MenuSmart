from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI

from app.observability import MetricsRegistry, ObservabilityMiddleware, configure_logging
from app.routers import health, ingredients, metrics, scrape
from app.scrapers.config import ScraperSettings
from app.scrapers.service import ScraperService
from app.seguridad import exigir_clave_de_servicio


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = ScraperSettings.from_env()
    async with httpx.AsyncClient(
        timeout=settings.timeout_seconds, follow_redirects=True
    ) as client:
        app.state.scraper_service = ScraperService(client, settings)
        yield


configure_logging()
app = FastAPI(title="MenuSmart Python Service", version="0.2.0", lifespan=lifespan)
app.state.metrics = MetricsRegistry()
app.add_middleware(ObservabilityMiddleware, metrics=app.state.metrics)

# /health queda abierto (lo usan los orquestadores); el resto exige la clave de servicio si esta
# configurada (ver app/seguridad.py).
app.include_router(health.router)
_protegidas = [Depends(exigir_clave_de_servicio)]
app.include_router(metrics.router, dependencies=_protegidas)
app.include_router(ingredients.router, dependencies=_protegidas)
app.include_router(scrape.router, dependencies=_protegidas)
