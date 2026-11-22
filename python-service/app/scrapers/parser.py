import json
import re
from collections.abc import Iterator
from typing import Any

_LD_JSON_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)


class ParseError(Exception):
    """La respuesta no trae la estructura esperada (la tienda pudo cambiar su pagina)."""


def _nodos(data: Any) -> Iterator[dict[str, Any]]:
    if isinstance(data, list):
        for elemento in data:
            yield from _nodos(elemento)
    elif isinstance(data, dict):
        yield data
        grafo = data.get("@graph")
        if isinstance(grafo, list):
            yield from _nodos(grafo)


def extract_product_list(html: str) -> list[dict[str, Any]]:
    """Extrae los productos del bloque JSON-LD `ItemList` de una pagina de busqueda.

    Devuelve los diccionarios `item` (schema.org Product) tal como vienen. Lanza
    ParseError si la pagina no trae ningun ItemList.
    """
    encontrado = False
    productos: list[dict[str, Any]] = []
    for bloque in _LD_JSON_RE.findall(html):
        try:
            data = json.loads(bloque)
        except json.JSONDecodeError:
            continue
        for nodo in _nodos(data):
            if nodo.get("@type") != "ItemList":
                continue
            encontrado = True
            for elemento in nodo.get("itemListElement") or []:
                item = elemento.get("item") if isinstance(elemento, dict) else None
                if isinstance(item, dict):
                    productos.append(item)
    if not encontrado:
        raise ParseError("la respuesta no trae un ItemList JSON-LD con productos")
    return productos
