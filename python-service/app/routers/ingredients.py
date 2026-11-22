from fastapi import APIRouter

from app.normalizacion import IngredienteEntrada, normalizar_ingredientes
from app.schemas import NormalizedIngredient, NormalizeRequest, NormalizeResponse

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.post("/normalize", response_model=NormalizeResponse)
def normalize_ingredients(payload: NormalizeRequest) -> NormalizeResponse:
    """Normaliza ingredientes escritos por el usuario para poder sumarlos y valorizarlos.

    Limpia el nombre, lo mapea a un termino del catalogo de precios (por nombre exacto,
    singular o sinonimo), convierte las cantidades a kg, l o un y une las lineas repetidas.
    Cada item informa las reglas aplicadas para poder explicar el resultado. Es lo que permite
    generar la lista de compras y estimar su costo en cada supermercado.
    """
    normalizados = normalizar_ingredientes(
        [IngredienteEntrada(i.name, i.quantity, i.unit) for i in payload.ingredients]
    )
    items = [
        NormalizedIngredient(
            name=n.nombre,
            quantity=n.cantidad,
            unit=n.unidad,
            term=n.termino,
            category=n.categoria,
            rules=n.reglas,
            original_names=n.nombres_originales,
            merged_lines=n.lineas_unidas,
        )
        for n in normalizados
    ]
    return NormalizeResponse(
        items=items,
        original_count=len(payload.ingredients),
        normalized_count=len(items),
    )
