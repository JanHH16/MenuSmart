from fastapi import APIRouter, Depends, Request

from app.scrapers.schemas import ScrapeRequest, ScrapeResponse
from app.scrapers.service import ScraperService

router = APIRouter(prefix="/scrape", tags=["scrape"])


def get_scraper_service(request: Request) -> ScraperService:
    return request.app.state.scraper_service


@router.post("/search", response_model=ScrapeResponse)
async def search_prices(
    payload: ScrapeRequest, service: ScraperService = Depends(get_scraper_service)
) -> ScrapeResponse:
    """Busca precios de las consultas dadas en una tienda (Jumbo o Santa Isabel).

    Respeta el robots.txt de la tienda, limita la frecuencia de solicitudes y devuelve
    solo registros validados y sin duplicados. `estado` es `ok` si todas las consultas
    funcionaron, `parcial` si algunas fallaron y `fallido` si ninguna devolvió datos.
    NestJS es quien persiste el resultado: este servicio no escribe en la base de datos.
    """
    return await service.search(
        payload.tienda, payload.consultas, payload.max_resultados_por_consulta
    )
