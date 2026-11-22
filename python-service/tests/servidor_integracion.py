"""Servidor FastAPI real para las pruebas de integracion NestJS <-> Python.

Se levanta con `uvicorn tests.servidor_integracion:app` desde python-service/. Es la
aplicacion de produccion (`app.main:app`), con las mismas rutas, validacion y parser, y
con una unica diferencia: el cliente HTTP del scraper apunta a un transporte simulado que
sirve los fixtures de tests/fixtures en lugar de Jumbo y Santa Isabel. Asi el backend
prueba el contrato real sobre HTTP sin acceder nunca a internet.

Comportamientos simulados segun la consulta (parametro `ft`):
  - "caida":  la tienda responde 503 (error de servidor, se agotan los reintentos).
  - "malo":   la pagina no trae la estructura esperada (la tienda cambio su HTML).
  - otra:     devuelve los productos del fixture de la tienda.
"""

import httpx

from app.main import app
from app.routers.scrape import get_scraper_service
from app.scrapers.config import ScraperSettings
from app.scrapers.service import ScraperService
from tests.conftest import FIXTURES

_ROBOTS = "User-agent: *\nDisallow: */mi-carro\nDisallow: *?map=\n"


def _tienda_simulada(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/robots.txt":
        return httpx.Response(200, text=_ROBOTS)

    consulta = request.url.params.get("ft")
    if consulta == "caida":
        return httpx.Response(503)
    if consulta == "malo":
        return httpx.Response(200, text="<html>sin datos</html>")

    if "santaisabel" in request.url.host:
        html = (FIXTURES / "santa_isabel_arroz.html").read_text(encoding="utf-8")
        return httpx.Response(200, text=html.replace("jumbo.cl", "santaisabel.cl"))
    html = (FIXTURES / "jumbo_arroz.html").read_text(encoding="utf-8")
    return httpx.Response(200, text=html)


_servicio = ScraperService(
    httpx.AsyncClient(
        transport=httpx.MockTransport(_tienda_simulada), follow_redirects=True
    ),
    # Sin esperas entre solicitudes ni entre reintentos: la prueba debe ser rapida.
    ScraperSettings(min_interval_seconds=0, retry_backoff_seconds=0),
)

app.dependency_overrides[get_scraper_service] = lambda: _servicio
