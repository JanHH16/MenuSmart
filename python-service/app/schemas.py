from pydantic import BaseModel, Field, field_validator


class RawIngredient(BaseModel):
    name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1)

    @field_validator("name", "unit")
    @classmethod
    def strip_and_reject_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("no puede estar vacío ni contener solo espacios")
        return stripped


class NormalizeRequest(BaseModel):
    ingredients: list[RawIngredient] = Field(..., min_length=1)


class NormalizedIngredient(BaseModel):
    name: str = Field(description="Nombre del termino del catalogo, o el nombre limpio si no hay.")
    quantity: float = Field(description="Cantidad total ya convertida a la unidad de `unit`.")
    unit: str = Field(description="kg, l o un cuando se pudo convertir; si no, la unidad original.")
    term: str | None = Field(
        None, description="Termino del catalogo de precios al que se mapeo, o null."
    )
    category: str | None = Field(None, description="Categoria del termino, o null.")
    rules: list[str] = Field(
        default_factory=list,
        description="Reglas aplicadas (mapeo de nombre, conversion de unidad, equivalencias).",
    )
    original_names: list[str] = Field(
        default_factory=list, description="Nombres tal como los escribio el usuario."
    )
    merged_lines: int = Field(1, description="Cuantas lineas de ingredientes se unieron.")


class NormalizeResponse(BaseModel):
    items: list[NormalizedIngredient]
    original_count: int
    normalized_count: int
