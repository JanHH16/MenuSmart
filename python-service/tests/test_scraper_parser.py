import json

import pytest

from app.scrapers.parser import ParseError, extract_product_list

SLUG_COMUN = "arroz-largo-fino-1-kg-cuisine-and-co-1845787"


def _slug(url: str) -> str:
    return url.rstrip("/").split("/")[-2]


def test_extrae_los_40_productos_reales_de_jumbo(jumbo_html):
    items = extract_product_list(jumbo_html)
    assert len(items) == 40
    assert items[0]["name"] == "Arroz Grado 1 Banquete Premium Grano Largo y Ancho 1 kg"
    assert items[0]["offers"]["price"] == 1890
    assert items[0]["offers"]["priceCurrency"] == "CLP"


def test_extrae_los_40_productos_reales_de_santa_isabel(santa_isabel_html):
    items = extract_product_list(santa_isabel_html)
    assert len(items) == 40
    assert items[0]["offers"]["price"] == 990


def test_el_mismo_producto_comparte_slug_entre_tiendas(jumbo_html, santa_isabel_html):
    jumbo = {_slug(i["url"]): i["offers"]["price"] for i in extract_product_list(jumbo_html)}
    santa = {_slug(i["url"]): i["offers"]["price"] for i in extract_product_list(santa_isabel_html)}
    assert SLUG_COMUN in jumbo
    assert SLUG_COMUN in santa
    assert jumbo[SLUG_COMUN] != santa[SLUG_COMUN]


def test_ignora_bloques_json_ld_mal_formados():
    ld_item = {
        "@type": "ItemList",
        "itemListElement": [{"@type": "ListItem", "item": {"name": "Arroz"}}],
    }
    html = (
        '<script type="application/ld+json">{esto no es json</script>'
        f'<script type="application/ld+json">{json.dumps(ld_item)}</script>'
    )
    assert extract_product_list(html) == [{"name": "Arroz"}]


def test_encuentra_el_itemlist_dentro_de_un_graph():
    data = {"@graph": [{"@type": "Organization"}, {"@type": "ItemList", "itemListElement": [
        {"item": {"name": "Pollo"}}
    ]}]}
    html = f'<script type="application/ld+json">{json.dumps(data)}</script>'
    assert extract_product_list(html) == [{"name": "Pollo"}]


def test_itemlist_vacio_es_valido_y_no_trae_productos():
    html = '<script type="application/ld+json">{"@type":"ItemList","itemListElement":[]}</script>'
    assert extract_product_list(html) == []


def test_sin_itemlist_lanza_parse_error():
    with pytest.raises(ParseError):
        extract_product_list("<html><body>sin datos estructurados</body></html>")
