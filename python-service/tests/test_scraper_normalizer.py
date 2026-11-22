import pytest

from app.scrapers.normalizer import (
    Cantidad,
    ItemInvalido,
    construir_producto,
    external_id_desde_url,
    extraer_cantidad,
    normalizar_nombre,
    precio_unitario,
)
from app.scrapers.stores import STORES

JUMBO = STORES["jumbo"]
URL_OK = "https://www.jumbo.cl/arroz-grado-1-banquete-1-kg/p"


def _item(**cambios):
    base = {
        "name": "Arroz Grado 1 Banquete 1 kg",
        "brand": {"name": "Banquete"},
        "image": "https://jumbocl.vteximg.com.br/arroz.jpg",
        "offers": {
            "priceCurrency": "CLP",
            "price": 1890,
            "availability": "https://schema.org/InStock",
            "url": URL_OK,
        },
    }
    base.update(cambios)
    return base


@pytest.mark.parametrize(
    ("nombre", "esperado"),
    [
        ("Arroz Grado 1 Banquete Premium 1 kg", Cantidad(1.0, "kg")),
        ("Arroz Basmati Tucapel 400 g", Cantidad(0.4, "kg")),
        ("Leche Entera 1,5 L", Cantidad(1.5, "l")),
        ("Bebida Cola 500 ml", Cantidad(0.5, "l")),
        ("Huevos Blancos 12 un", Cantidad(12.0, "un")),
        ("Arroz Cosecha Especial Tucapel", None),
        ("Producto con 1 Lleva 2", None),
    ],
)
def test_extraer_cantidad(nombre, esperado):
    assert extraer_cantidad(nombre) == esperado


def test_precio_unitario_coincide_con_el_de_la_tienda():
    # Tucapel Basmati 400 g a $2.090 se muestra como $5.225 x kg
    assert precio_unitario(2090, Cantidad(0.4, "kg")) == 5225
    assert precio_unitario(2090, None) is None


def test_normalizar_nombre_quita_tildes_y_simbolos():
    assert normalizar_nombre("Cuisine & Co Ñoquis  Crème") == "cuisine y co noquis creme"


def test_external_id_es_el_slug_de_la_url():
    assert external_id_desde_url(URL_OK, JUMBO.hosts) == "arroz-grado-1-banquete-1-kg"


@pytest.mark.parametrize(
    "url",
    [
        "http://www.jumbo.cl/arroz-1-kg/p",
        "https://evil.example/arroz-1-kg/p",
        "https://www.jumbo.cl/",
        "https://www.jumbo.cl/Arroz Raro/p",
        "",
    ],
)
def test_external_id_rechaza_urls_invalidas(url):
    with pytest.raises(ItemInvalido) as exc:
        external_id_desde_url(url, JUMBO.hosts)
    assert exc.value.motivo == "url_invalida"


def test_construir_producto_completo():
    producto = construir_producto(_item(), store=JUMBO, consulta="arroz")
    assert producto.external_id == "arroz-grado-1-banquete-1-kg"
    assert producto.precio == 1890
    assert producto.marca == "Banquete"
    assert (producto.cantidad, producto.unidad, producto.precio_unitario) == (1.0, "kg", 1890)
    assert producto.disponible is True
    assert producto.nombre_normalizado == "arroz grado 1 banquete 1 kg"


def test_producto_agotado_queda_no_disponible():
    item = _item()
    item["offers"]["availability"] = "https://schema.org/OutOfStock"
    assert construir_producto(item, store=JUMBO, consulta="arroz").disponible is False


@pytest.mark.parametrize(
    ("item", "motivo"),
    [
        (_item(name="   "), "sin_nombre"),
        (_item(offers=None), "sin_precio"),
        (_item(offers={"priceCurrency": "CLP", "url": URL_OK}), "sin_precio"),
        (_item(offers={"priceCurrency": "CLP", "price": 0, "url": URL_OK}), "precio_invalido"),
        (_item(offers={"priceCurrency": "CLP", "price": -5, "url": URL_OK}), "precio_invalido"),
        (_item(offers={"priceCurrency": "CLP", "price": "abc", "url": URL_OK}), "precio_invalido"),
        (_item(offers={"priceCurrency": "CLP", "price": True, "url": URL_OK}), "precio_invalido"),
        (_item(offers={"priceCurrency": "USD", "price": 5, "url": URL_OK}), "moneda_invalida"),
        (
            _item(offers={"priceCurrency": "CLP", "price": 5, "url": "https://x.io/a-b-c/p"}),
            "url_invalida",
        ),
    ],
)
def test_construir_producto_descarta_datos_invalidos(item, motivo):
    with pytest.raises(ItemInvalido) as exc:
        construir_producto(item, store=JUMBO, consulta="arroz")
    assert exc.value.motivo == motivo


def test_precio_como_texto_numerico_se_acepta():
    item = _item()
    item["offers"]["price"] = "1890"
    assert construir_producto(item, store=JUMBO, consulta="arroz").precio == 1890
