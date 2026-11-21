from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Tienda = Literal["jumbo", "santa_isabel"]
TipoError = Literal[
    "timeout", "red", "bloqueo", "http", "robots", "estructura", "respuesta_invalida"
]
EstadoEjecucion = Literal["ok", "parcial", "fallido"]


class ScrapeRequest(BaseModel):
    tienda: Tienda
    consultas: list[str] = Field(..., min_length=1, max_length=10)
    max_resultados_por_consulta: int = Field(10, ge=1, le=40)

    @field_validator("consultas")
    @classmethod
    def limpiar_consultas(cls, valores: list[str]) -> list[str]:
        limpias: list[str] = []
        for valor in valores:
            texto = " ".join(valor.split())
            if not texto:
                raise ValueError("las consultas no pueden estar vacías")
            if len(texto) > 60:
                raise ValueError("cada consulta admite como máximo 60 caracteres")
            if texto.lower() not in {existente.lower() for existente in limpias}:
                limpias.append(texto)
        return limpias


class ProductoScrapeado(BaseModel):
    consulta: str
    external_id: str = Field(..., min_length=3, max_length=200)
    nombre: str = Field(..., min_length=1, max_length=300)
    nombre_normalizado: str = Field(..., min_length=1, max_length=300)
    marca: str | None = None
    precio: int = Field(..., gt=0, le=100_000_000)
    moneda: Literal["CLP"] = "CLP"
    cantidad: float | None = Field(None, gt=0)
    unidad: Literal["kg", "l", "un"] | None = None
    precio_unitario: int | None = Field(None, gt=0)
    disponible: bool
    url: str
    imagen: str | None = None


class ErrorScrape(BaseModel):
    consulta: str | None = None
    tipo: TipoError
    detalle: str


class EstadisticasScrape(BaseModel):
    consultas_total: int
    consultas_ok: int
    consultas_fallidas: int
    registros_extraidos: int
    registros_validos: int
    registros_duplicados: int
    registros_descartados: int
    descartes_por_motivo: dict[str, int]
    duracion_ms: int


class ScrapeResponse(BaseModel):
    tienda: Tienda
    estado: EstadoEjecucion
    obtenido_en: datetime
    resultados: list[ProductoScrapeado]
    errores: list[ErrorScrape]
    estadisticas: EstadisticasScrape
