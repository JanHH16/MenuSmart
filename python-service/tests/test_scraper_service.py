import asyncio
import json

import httpx

from app.scrapers.config import ScraperSettings
from app.scrapers.service import ScraperService

ROBOTS_OK = "User-agent: *\nDisallow: */mi-carro\nDisallow: *?map=\n"
ROBOTS_BLOQUEA_BUSQUEDA = "User-agent: *\nDisallow: /busqueda\n"


def _ejecutar(handler, tienda="jumbo", consultas=("arroz",), max_resultados=10, **ajustes):
    """Corre una busqueda contra un transporte simulado (sin red, sin esperas)."""

    async def correr():
        settings = ScraperSettings(min_interval_seconds=0, retry_backoff_seconds=0, **ajustes)
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler), follow_redirects=True
        ) as client:
            servicio = ScraperService(client, settings)
            return await servicio.search(tienda, list(consultas), max_resultados)

    return asyncio.run(correr())


def _tienda(html, robots=ROBOTS_OK, llamadas=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if llamadas is not None:
            llamadas.append(request.url.path)
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=robots)
        return httpx.Response(200, text=html)

    return handler


def _ld(items):
    data = {"@type": "ItemList", "itemListElement": [{"item": i} for i in items]}
    return f'<script type="application/ld+json">{json.dumps(data)}</script>'


def _item(nombre, precio, slug, **extra):
    return {
        "name": nombre,
        "offers": {
            "priceCurrency": "CLP",
            "price": precio,
            "availability": "https://schema.org/InStock",
            "url": f"https://www.jumbo.cl/{slug}/p",
        },
        **extra,
    }


def test_busqueda_exitosa_devuelve_productos_validos(jumbo_html):
    r = _ejecutar(_tienda(jumbo_html), max_resultados=5)
    assert r.estado == "ok"
    assert r.errores == []
    assert len(r.resultados) == 5
    assert r.resultados[0].precio == 1890
    assert r.resultados[0].consulta == "arroz"
    e = r.estadisticas
    assert (e.consultas_total, e.consultas_ok, e.consultas_fallidas) == (1, 1, 0)
    clasificados = e.registros_validos + e.registros_duplicados + e.registros_descartados
    assert e.registros_extraidos == clasificados


def test_deduplica_productos_repetidos_entre_consultas(jumbo_html):
    r = _ejecutar(_tienda(jumbo_html), consultas=("arroz", "arroz grado 1"), max_resultados=40)
    assert len(r.resultados) == 40
    assert r.estadisticas.registros_duplicados == 40
    assert r.estadisticas.registros_extraidos == 80


def test_descarta_items_invalidos_y_los_cuenta_por_motivo():
    html = _ld(
        [
            _item("Arroz bueno 1 kg", 1500, "arroz-bueno-1-kg"),
            _item("Arroz sin precio", None, "arroz-sin-precio"),
            _item("Arroz gratis", 0, "arroz-gratis"),
            _item("   ", 100, "sin-nombre-aca"),
        ]
    )
    r = _ejecutar(_tienda(html))
    assert [p.external_id for p in r.resultados] == ["arroz-bueno-1-kg"]
    assert r.estadisticas.registros_descartados == 3
    assert r.estadisticas.descartes_por_motivo == {
        "sin_precio": 1,
        "precio_invalido": 1,
        "sin_nombre": 1,
    }
    assert r.estado == "ok"


def test_timeout_reintenta_y_termina_como_fallido():
    llamadas = []

    def handler(request):
        llamadas.append(request.url.path)
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=ROBOTS_OK)
        raise httpx.ReadTimeout("lento", request=request)

    r = _ejecutar(handler)
    assert r.estado == "fallido"
    assert r.errores[0].tipo == "timeout"
    assert llamadas.count("/busqueda") == 3  # 1 intento + 2 reintentos


def test_error_de_servidor_se_recupera_si_el_reintento_funciona(jumbo_html):
    intentos = {"n": 0}

    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=ROBOTS_OK)
        intentos["n"] += 1
        if intentos["n"] == 1:
            return httpx.Response(503)
        return httpx.Response(200, text=jumbo_html)

    r = _ejecutar(handler, max_resultados=3)
    assert r.estado == "ok"
    assert len(r.resultados) == 3
    assert intentos["n"] == 2


def test_bloqueo_429_no_se_reintenta():
    llamadas = []

    def handler(request):
        llamadas.append(request.url.path)
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=ROBOTS_OK)
        return httpx.Response(429)

    r = _ejecutar(handler)
    assert r.errores[0].tipo == "bloqueo"
    assert llamadas.count("/busqueda") == 1


def test_pagina_sin_estructura_esperada_se_reporta_como_estructura():
    r = _ejecutar(_tienda("<html>la tienda cambio su pagina</html>"))
    assert r.estado == "fallido"
    assert r.errores[0].tipo == "estructura"


def test_respeta_robots_y_no_pide_la_busqueda(jumbo_html):
    llamadas = []
    r = _ejecutar(_tienda(jumbo_html, ROBOTS_BLOQUEA_BUSQUEDA, llamadas))
    assert r.estado == "fallido"
    assert r.errores[0].tipo == "robots"
    assert "/busqueda" not in llamadas


def test_robots_no_disponible_impide_scrapear():
    def handler(request):
        return httpx.Response(500)

    r = _ejecutar(handler, consultas=("arroz", "pollo"))
    assert r.estado == "fallido"
    assert r.errores[0].consulta is None
    assert r.estadisticas.consultas_fallidas == 2


def test_robots_inexistente_404_equivale_a_sin_restricciones(jumbo_html):
    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(404)
        return httpx.Response(200, text=jumbo_html)

    r = _ejecutar(handler, max_resultados=2)
    assert r.estado == "ok"
    assert len(r.resultados) == 2


def test_redireccion_fuera_del_dominio_se_rechaza():
    def handler(request):
        if request.url.host == "evil.example":
            return httpx.Response(200, text="<html></html>")
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=ROBOTS_OK)
        return httpx.Response(302, headers={"Location": "https://evil.example/x"})

    r = _ejecutar(handler)
    assert r.errores[0].tipo == "respuesta_invalida"


def test_respuesta_demasiado_grande_se_rechaza(jumbo_html):
    r = _ejecutar(_tienda(jumbo_html), max_response_bytes=1000)
    assert r.errores[0].tipo == "respuesta_invalida"


def test_estado_parcial_cuando_falla_solo_una_consulta(jumbo_html):
    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text=ROBOTS_OK)
        if request.url.params.get("ft") == "malo":
            return httpx.Response(200, text="<html>sin datos</html>")
        return httpx.Response(200, text=jumbo_html)

    r = _ejecutar(handler, consultas=("arroz", "malo"), max_resultados=2)
    assert r.estado == "parcial"
    assert len(r.resultados) == 2
    assert [e.consulta for e in r.errores] == ["malo"]
    assert (r.estadisticas.consultas_ok, r.estadisticas.consultas_fallidas) == (1, 1)


def test_funciona_igual_con_santa_isabel(santa_isabel_html):
    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text="User-agent: *\nAllow: /\nDisallow: /api/\n")
        return httpx.Response(200, text=santa_isabel_html.replace("jumbo.cl", "santaisabel.cl"))

    r = _ejecutar(handler, tienda="santa_isabel", max_resultados=3)
    assert r.tienda == "santa_isabel"
    assert r.estado == "ok"
    assert len(r.resultados) == 3
