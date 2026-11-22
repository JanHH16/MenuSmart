from dataclasses import dataclass


@dataclass(frozen=True)
class Store:
    key: str
    base_url: str
    search_path: str
    query_param: str
    hosts: frozenset[str]


# Jumbo y Santa Isabel (grupo Cencosud) entregan la misma estructura: la pagina de
# busqueda trae un bloque JSON-LD (schema.org ItemList) con los productos.
STORES: dict[str, Store] = {
    "jumbo": Store(
        key="jumbo",
        base_url="https://www.jumbo.cl",
        search_path="/busqueda",
        query_param="ft",
        hosts=frozenset({"www.jumbo.cl", "jumbo.cl"}),
    ),
    "santa_isabel": Store(
        key="santa_isabel",
        base_url="https://www.santaisabel.cl",
        search_path="/busqueda",
        query_param="ft",
        hosts=frozenset({"www.santaisabel.cl", "santaisabel.cl"}),
    ),
}
