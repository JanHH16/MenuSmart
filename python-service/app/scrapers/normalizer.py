import math
import re
import unicodedata
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from pydantic import ValidationError

from app.scrapers.schemas import ProductoScrapeado
from app.scrapers.stores import Store

_UNIDAD_BASE: dict[str, tuple[str, float]] = {
    "kg": ("kg", 1.0),
    "g": ("kg", 0.001),
    "gr": ("kg", 0.001),
    "grs": ("kg", 0.001),
    "l": ("l", 1.0),
    "lt": ("l", 1.0),
    "lts": ("l", 1.0),
    "ml": ("l", 0.001),
    "cc": ("l", 0.001),
    "un": ("un", 1.0),
    "unid": ("un", 1.0),
    "unidad": ("un", 1.0),
    "unidades": ("un", 1.0),
}
_CANTIDAD_RE = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*(kg|grs|gr|g|lts|lt|l|ml|cc|unidades|unidad|unid|un)\b",
    re.IGNORECASE,
)
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,199}$")


class ItemInvalido(ValueError):
    def __init__(self, motivo: str, detalle: str) -> None:
        super().__init__(detalle)
        self.motivo = motivo


@dataclass(frozen=True)
class Cantidad:
    valor: float
    unidad: str


def normalizar_nombre(nombre: str) -> str:
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFKD", nombre) if not unicodedata.combining(c)
    )
    reemplazado = sin_tildes.lower().replace("&", " y ")
    limpio = re.sub(r"[^a-z0-9\s]", " ", reemplazado)
    return " ".join(limpio.split())


def extraer_cantidad(nombre: str) -> Cantidad | None:
    """Obtiene la cantidad (en unidad base kg/l/un) desde el nombre, ej. '400 g' -> 0.4 kg."""
    coincidencias = list(_CANTIDAD_RE.finditer(nombre))
    if not coincidencias:
        return None
    numero, unidad = coincidencias[-1].groups()
    base, factor = _UNIDAD_BASE[unidad.lower()]
    valor = float(numero.replace(",", ".")) * factor
    if valor <= 0:
        return None
    return Cantidad(valor=round(valor, 6), unidad=base)


def precio_unitario(precio: int, cantidad: Cantidad | None) -> int | None:
    if cantidad is None:
        return None
    return round(precio / cantidad.valor)


def external_id_desde_url(url: str, hosts: frozenset[str]) -> str:
    """El slug de la URL identifica el producto y coincide entre Jumbo y Santa Isabel."""
    partes = urlparse(url)
    if partes.scheme != "https" or partes.hostname not in hosts:
        raise ItemInvalido("url_invalida", "la URL no pertenece al dominio de la tienda")
    segmentos = [s for s in partes.path.split("/") if s]
    if not segmentos or not _SLUG_RE.match(segmentos[0]):
        raise ItemInvalido("url_invalida", "la URL no trae un slug de producto válido")
    return segmentos[0]


def _parse_precio(valor: Any) -> int:
    if valor is None:
        raise ItemInvalido("sin_precio", "la oferta no trae precio")
    if isinstance(valor, bool):
        raise ItemInvalido("precio_invalido", "el precio no es numérico")
    if isinstance(valor, str):
        if not valor.strip().isdigit():
            raise ItemInvalido("precio_invalido", "el precio no es numérico")
        valor = int(valor)
    if not isinstance(valor, int | float) or not math.isfinite(valor):
        raise ItemInvalido("precio_invalido", "el precio no es numérico")
    if valor <= 0:
        raise ItemInvalido("precio_invalido", "el precio debe ser mayor que cero")
    return round(valor)


def construir_producto(
    item: dict[str, Any], *, store: Store, consulta: str
) -> ProductoScrapeado:
    nombre = " ".join(str(item.get("name") or "").split())
    if not nombre:
        raise ItemInvalido("sin_nombre", "el producto no trae nombre")

    ofertas = item.get("offers")
    if isinstance(ofertas, list):
        ofertas = ofertas[0] if ofertas else None
    if not isinstance(ofertas, dict):
        raise ItemInvalido("sin_precio", "el producto no trae oferta")

    if ofertas.get("priceCurrency") != "CLP":
        raise ItemInvalido("moneda_invalida", "la moneda no es CLP")
    precio = _parse_precio(ofertas.get("price"))

    url = str(ofertas.get("url") or item.get("url") or "")
    external_id = external_id_desde_url(url, store.hosts)

    marca = item.get("brand")
    if isinstance(marca, dict):
        marca = marca.get("name")
    marca = " ".join(marca.split()) if isinstance(marca, str) and marca.strip() else None

    imagen = item.get("image")
    if isinstance(imagen, list):
        imagen = imagen[0] if imagen else None
    imagen = imagen if isinstance(imagen, str) and imagen.startswith("https://") else None

    cantidad = extraer_cantidad(nombre)
    try:
        return ProductoScrapeado(
            consulta=consulta,
            external_id=external_id,
            nombre=nombre,
            nombre_normalizado=normalizar_nombre(nombre),
            marca=marca,
            precio=precio,
            moneda="CLP",
            cantidad=cantidad.valor if cantidad else None,
            unidad=cantidad.unidad if cantidad else None,
            precio_unitario=precio_unitario(precio, cantidad),
            disponible="InStock" in str(ofertas.get("availability", "")),
            url=url,
            imagen=imagen,
        )
    except ValidationError as exc:
        primero = exc.errors()[0]
        campo = ".".join(str(p) for p in primero["loc"])
        raise ItemInvalido("datos_invalidos", f"{campo}: {primero['msg']}") from exc
