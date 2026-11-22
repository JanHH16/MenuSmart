import secrets

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Se genera al azar en cada ejecucion: nunca hay una clave escrita en el repositorio.
CLAVE = secrets.token_urlsafe(24)

CUERPO_NORMALIZAR = {"ingredients": [{"name": "Arroz", "quantity": 1, "unit": "kg"}]}
RUTAS_PROTEGIDAS = [
    ("post", "/ingredients/normalize", CUERPO_NORMALIZAR),
    ("post", "/scrape/search", {"tienda": "jumbo", "consultas": ["arroz"]}),
    ("get", "/metrics", None),
]


def _llamar(metodo, ruta, cuerpo, cabeceras=None):
    if metodo == "get":
        return client.get(ruta, headers=cabeceras)
    return client.post(ruta, json=cuerpo, headers=cabeceras)


class TestSinClaveConfigurada:
    """Desarrollo local y Docker Compose: sin SERVICE_API_KEY no se exige nada."""

    def test_no_exige_clave(self, monkeypatch):
        monkeypatch.delenv("SERVICE_API_KEY", raising=False)
        assert client.post("/ingredients/normalize", json=CUERPO_NORMALIZAR).status_code == 200

    def test_variable_vacia_se_considera_desactivada(self, monkeypatch):
        monkeypatch.setenv("SERVICE_API_KEY", "")
        assert client.post("/ingredients/normalize", json=CUERPO_NORMALIZAR).status_code == 200


class TestConClaveConfigurada:
    @pytest.fixture(autouse=True)
    def _activar_clave(self, monkeypatch):
        monkeypatch.setenv("SERVICE_API_KEY", CLAVE)

    @pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_PROTEGIDAS)
    def test_rechaza_sin_cabecera(self, metodo, ruta, cuerpo):
        assert _llamar(metodo, ruta, cuerpo).status_code == 401

    @pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_PROTEGIDAS)
    def test_rechaza_clave_incorrecta(self, metodo, ruta, cuerpo):
        respuesta = _llamar(metodo, ruta, cuerpo, {"X-Service-Key": "otra-clave"})
        assert respuesta.status_code == 401
        assert CLAVE not in respuesta.text

    def test_acepta_la_clave_correcta(self):
        respuesta = client.post(
            "/ingredients/normalize",
            json=CUERPO_NORMALIZAR,
            headers={"X-Service-Key": CLAVE},
        )
        assert respuesta.status_code == 200
        assert respuesta.json()["items"][0]["name"] == "arroz"

    def test_metricas_con_la_clave_correcta(self):
        respuesta = client.get("/metrics", headers={"X-Service-Key": CLAVE})
        assert respuesta.status_code == 200

    def test_health_sigue_abierto(self):
        respuesta = client.get("/health")
        assert respuesta.status_code == 200
        assert respuesta.json()["status"] == "ok"

    def test_el_rechazo_no_deja_de_devolver_el_id_de_solicitud(self):
        respuesta = client.get("/metrics", headers={"X-Request-ID": "sin-clave-1"})
        assert respuesta.status_code == 401
        assert respuesta.headers["X-Request-ID"] == "sin-clave-1"
