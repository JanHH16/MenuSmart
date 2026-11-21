from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.scrape import get_scraper_service
from app.scrapers.schemas import EstadisticasScrape, ScrapeResponse


class ServicioFalso:
    def __init__(self) -> None:
        self.llamadas: list[tuple] = []

    async def search(self, tienda, consultas, max_resultados):
        self.llamadas.append((tienda, consultas, max_resultados))
        return ScrapeResponse(
            tienda=tienda,
            estado="ok",
            obtenido_en=datetime.now(UTC),
            resultados=[],
            errores=[],
            estadisticas=EstadisticasScrape(
                consultas_total=len(consultas),
                consultas_ok=len(consultas),
                consultas_fallidas=0,
                registros_extraidos=0,
                registros_validos=0,
                registros_duplicados=0,
                registros_descartados=0,
                descartes_por_motivo={},
                duracion_ms=1,
            ),
        )


@pytest.fixture
def servicio():
    falso = ServicioFalso()
    app.dependency_overrides[get_scraper_service] = lambda: falso
    yield falso
    app.dependency_overrides.clear()


client = TestClient(app)


def test_busqueda_valida_responde_con_el_contrato(servicio):
    r = client.post(
        "/scrape/search", json={"tienda": "jumbo", "consultas": ["  arroz  ", "Pollo"]}
    )
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["estado"] == "ok"
    assert cuerpo["tienda"] == "jumbo"
    assert set(cuerpo) == {
        "tienda",
        "estado",
        "obtenido_en",
        "resultados",
        "errores",
        "estadisticas",
    }
    assert servicio.llamadas == [("jumbo", ["arroz", "Pollo"], 10)]


def test_consultas_repetidas_se_unifican(servicio):
    client.post("/scrape/search", json={"tienda": "santa_isabel", "consultas": ["Arroz", "arroz"]})
    assert servicio.llamadas[0][1] == ["Arroz"]


@pytest.mark.parametrize(
    "payload",
    [
        {"tienda": "lider", "consultas": ["arroz"]},
        {"tienda": "jumbo", "consultas": []},
        {"tienda": "jumbo", "consultas": ["   "]},
        {"tienda": "jumbo", "consultas": ["x" * 61]},
        {"tienda": "jumbo", "consultas": [f"p{i}" for i in range(11)]},
        {"tienda": "jumbo", "consultas": ["arroz"], "max_resultados_por_consulta": 0},
        {"tienda": "jumbo", "consultas": ["arroz"], "max_resultados_por_consulta": 41},
        {"consultas": ["arroz"]},
    ],
)
def test_solicitudes_invalidas_se_rechazan_con_422(servicio, payload):
    assert client.post("/scrape/search", json=payload).status_code == 422
    assert servicio.llamadas == []
