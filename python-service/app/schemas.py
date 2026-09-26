from typing import List

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
    ingredients: List[RawIngredient] = Field(..., min_length=1)


class NormalizedIngredient(BaseModel):
    name: str
    quantity: float
    unit: str


class NormalizeResponse(BaseModel):
    items: List[NormalizedIngredient]
    original_count: int
    normalized_count: int
