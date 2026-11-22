from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from app.observability import MetricsRegistry, ObservabilityMiddleware, configure_logging
from app.routers import health, ingredients, metrics, scrape
from app.scrapers.config import ScraperSettings
from app.scrapers.service import ScraperService


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

app.include_router(health.router)
app.include_router(metrics.router)
app.include_router(ingredients.router)
app.include_router(scrape.router)
