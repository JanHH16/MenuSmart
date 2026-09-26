from fastapi import APIRouter

from app.schemas import NormalizedIngredient, NormalizeRequest, NormalizeResponse

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


@router.post("/normalize", response_model=NormalizeResponse)
def normalize_ingredients(payload: NormalizeRequest) -> NormalizeResponse:
    """Combina ingredientes repetidos (mismo nombre + unidad) sumando sus cantidades.

    Esto es lo que permite generar una lista de compras sin ingredientes duplicados
    cuando el mismo producto aparece en varias comidas de la semana.
    """
    merged: dict[tuple[str, str], float] = {}
    for item in payload.ingredients:
        key = (_normalize_name(item.name), item.unit.strip().lower())
        merged[key] = merged.get(key, 0) + item.quantity

    normalized = [
        NormalizedIngredient(name=name, quantity=round(quantity, 2), unit=unit)
        for (name, unit), quantity in merged.items()
    ]

    return NormalizeResponse(
        items=normalized,
        original_count=len(payload.ingredients),
        normalized_count=len(normalized),
    )
