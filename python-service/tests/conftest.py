from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


# Fixtures capturados el 21-11-2026 desde la busqueda "arroz" de cada tienda (solo el
# bloque JSON-LD ItemList). Son datos congelados: los precios reales ya cambiaron.
@pytest.fixture
def jumbo_html() -> str:
    return (FIXTURES / "jumbo_arroz.html").read_text(encoding="utf-8")


@pytest.fixture
def santa_isabel_html() -> str:
    return (FIXTURES / "santa_isabel_arroz.html").read_text(encoding="utf-8")
