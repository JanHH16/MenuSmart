from typing import List

from pydantic import BaseModel, Field


class RawIngredient(BaseModel):
    name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1)


class NormalizeRequest(BaseModel):
    ingredients: List[RawIngredient]


class NormalizedIngredient(BaseModel):
    name: str
    quantity: float
    unit: str


class NormalizeResponse(BaseModel):
    items: List[NormalizedIngredient]
    original_count: int
    normalized_count: int
