from fastapi import APIRouter, Request

router = APIRouter(tags=["observabilidad"])


@router.get("/metrics")
def metrics(request: Request) -> dict:
    """Tiempos de respuesta por ruta y resultado de las corridas de scraping, desde el arranque."""
    return request.app.state.metrics.snapshot()
