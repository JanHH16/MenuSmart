import json
import logging
from collections import Counter
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.observability import (
    JsonFormatter,
    MetricsRegistry,
    id_de_solicitud,
    percentil,
    request_id_var,
)
from app.routers.scrape import get_scraper_service
from app.scrapers.schemas import ErrorScrape, EstadisticasScrape, ScrapeResponse

client = TestClient(app)


def _respuesta_con_error(tienda, consultas, max_resultados):
    return ScrapeResponse(
        tienda=tienda,
        estado="parcial",
        obtenido_en=datetime.now(UTC),
        resultados=[],
        errores=[ErrorScrape(consulta="arroz", tipo="timeout", detalle="sin respuesta")],
        estadisticas=EstadisticasScrape(
            consultas_total=2,
            consultas_ok=1,
            consultas_fallidas=1,
            registros_extraidos=0,
            registros_validos=0,
            registros_duplicados=0,
            registros_descartados=0,
            descartes_por_motivo={},
            duracion_ms=1500,
        ),
    )


class TestIdDeSolicitud:
    def test_reutiliza_un_id_seguro(self):
        assert id_de_solicitud("abc-123_X.9") == "abc-123_X.9"

    @pytest.mark.parametrize("valor", [None, "", "con espacios", "a" * 65, "id\nfalso", "<script>"])
    def test_genera_uno_nuevo_si_falta_o_no_es_seguro(self, valor):
        generado = id_de_solicitud(valor)
        assert generado != valor
        assert len(generado) == 32


class TestMiddleware:
    def test_devuelve_el_id_recibido_en_la_cabecera(self):
        r = client.get("/health", headers={"X-Request-ID": "pedido-42"})
        assert r.headers["X-Request-ID"] == "pedido-42"

    def test_genera_un_id_si_no_llega_ninguno(self):
        r = client.get("/health")
        assert len(r.headers["X-Request-ID"]) == 32

    def test_el_id_tambien_sale_en_respuestas_de_error(self):
        r = client.get("/scrape/search", headers={"X-Request-ID": "malo-1"})
        assert r.status_code == 405
        assert r.headers["X-Request-ID"] == "malo-1"

    def test_registra_la_solicitud_en_el_log_con_su_id(self, caplog):
        with caplog.at_level(logging.INFO, logger="menusmart.http"):
            client.get("/no-existe", headers={"X-Request-ID": "log-1"})
        registro = next(r for r in caplog.records if r.getMessage() == "http_request")
        assert registro.campos["status"] == 404
        assert registro.campos["path"] == "/no-existe"
        assert registro.campos["durationMs"] >= 0

    def test_el_id_no_queda_pegado_al_contexto_despues_de_la_solicitud(self):
        client.get("/health", headers={"X-Request-ID": "temporal"})
        assert request_id_var.get() is None


class TestMetricas:
    def test_muestra_tiempos_por_ruta_con_la_plantilla_de_la_ruta(self):
        client.get("/health")
        cuerpo = client.get("/metrics").json()
        ruta = next(r for r in cuerpo["rutas"] if r["ruta"] == "GET /health")
        assert ruta["solicitudes"] >= 1
        assert ruta["p95Ms"] >= ruta["p50Ms"] >= 0
        assert cuerpo["servicio"] == "menusmart-python-service"

    def test_rutas_inexistentes_no_multiplican_las_claves(self):
        client.get("/no-existe-1")
        client.get("/no-existe-2")
        claves = [r["ruta"] for r in client.get("/metrics").json()["rutas"]]
        assert "GET (sin ruta)" in claves
        assert "GET /no-existe-1" not in claves

    def test_cuenta_los_errores_5xx(self):
        registro = MetricsRegistry()
        registro.registrar_solicitud("GET", "/x", 200, 0.01)
        registro.registrar_solicitud("GET", "/x", 500, 0.03)
        ruta = registro.snapshot()["rutas"][0]
        assert ruta["solicitudes"] == 2
        assert ruta["errores5xx"] == 1
        assert ruta["promedioMs"] == pytest.approx(20)

    def test_percentiles(self):
        muestras = [float(n) for n in range(1, 101)]
        assert percentil(muestras, 50) == 50
        assert percentil(muestras, 95) == 95
        assert percentil([], 95) == 0.0

    def test_registra_los_errores_de_la_fuente_externa(self):
        servicio = type("S", (), {"search": staticmethod(_async(_respuesta_con_error))})()
        app.dependency_overrides[get_scraper_service] = lambda: servicio
        try:
            r = client.post("/scrape/search", json={"tienda": "jumbo", "consultas": ["arroz"]})
        finally:
            app.dependency_overrides.clear()
        assert r.status_code == 200
        fuente = client.get("/metrics").json()["fuenteExterna"]["jumbo"]
        assert fuente["porEstado"]["parcial"] >= 1
        assert fuente["erroresPorTipo"]["timeout"] >= 1
        assert fuente["duracionPromedioMs"] > 0

    def test_registrar_scrape_acumula_por_tienda(self):
        registro = MetricsRegistry()
        registro.registrar_scrape("jumbo", "ok", 1000, Counter())
        registro.registrar_scrape("jumbo", "fallido", 3000, Counter({"red": 2}))
        fuente = registro.snapshot()["fuenteExterna"]["jumbo"]
        assert fuente["corridas"] == 2
        assert fuente["erroresPorTipo"] == {"red": 2}
        assert fuente["duracionPromedioMs"] == 2000


class TestJsonFormatter:
    def test_genera_una_linea_json_con_los_campos_extra_y_el_id(self):
        token = request_id_var.set("json-1")
        try:
            registro = logging.LogRecord("menusmart.test", logging.WARNING, "", 0, "hola", (), None)
            registro.campos = {"tienda": "jumbo"}
            salida = json.loads(JsonFormatter().format(registro))
        finally:
            request_id_var.reset(token)
        assert salida["msg"] == "hola"
        assert salida["level"] == "warning"
        assert salida["requestId"] == "json-1"
        assert salida["tienda"] == "jumbo"
        assert salida["service"] == "menusmart-python-service"


def _async(funcion):
    async def envoltura(*args, **kwargs):
        return funcion(*args, **kwargs)

    return envoltura
