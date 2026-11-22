import logging
from collections import Counter

from fastapi import APIRouter, Depends, Request

from app.scrapers.schemas import ScrapeRequest, ScrapeResponse
from app.scrapers.service import ScraperService

logger = logging.getLogger("menusmart.scrape")
router = APIRouter(prefix="/scrape", tags=["scrape"])


def get_scraper_service(request: Request) -> ScraperService:
    return request.app.state.scraper_service


@router.post("/search", response_model=ScrapeResponse)
async def search_prices(
    request: Request,
    payload: ScrapeRequest,
    service: ScraperService = Depends(get_scraper_service),
) -> ScrapeResponse:
    """Busca precios de las consultas dadas en una tienda (Jumbo o Santa Isabel).

    Respeta el robots.txt de la tienda, limita la frecuencia de solicitudes y devuelve
    solo registros validados y sin duplicados. `estado` es `ok` si todas las consultas
    funcionaron, `parcial` si algunas fallaron y `fallido` si ninguna devolvió datos.
    NestJS es quien persiste el resultado: este servicio no escribe en la base de datos.
    """
    respuesta = await service.search(
        payload.tienda, payload.consultas, payload.max_resultados_por_consulta
    )
    _registrar_resultado(request, respuesta)
    return respuesta


def _registrar_resultado(request: Request, respuesta: ScrapeResponse) -> None:
    """Deja en el log y en las metricas lo ocurrido con la fuente externa."""
    tipos = Counter(error.tipo for error in respuesta.errores)
    request.app.state.metrics.registrar_scrape(
        respuesta.tienda, respuesta.estado, respuesta.estadisticas.duracion_ms, tipos
    )
    for error in respuesta.errores:
        logger.warning(
            "error_fuente_externa",
            extra={
                "campos": {
                    "tienda": respuesta.tienda,
                    "consulta": error.consulta,
                    "tipo": error.tipo,
                }
            },
        )
    logger.info(
        "scrape_terminado",
        extra={
            "campos": {
                "tienda": respuesta.tienda,
                "estado": respuesta.estado,
                "consultas": respuesta.estadisticas.consultas_total,
                "registrosValidos": respuesta.estadisticas.registros_validos,
                "errores": len(respuesta.errores),
                "durationMs": respuesta.estadisticas.duracion_ms,
            }
        },
    )
