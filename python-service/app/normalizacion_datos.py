"""Tablas de datos de la normalizacion de ingredientes.

Todo el conocimiento del dominio vive aqui (unidades, equivalencias, sinonimos) para que las
reglas de `normalizacion.py` sean legibles y se puedan probar sin tocar los datos. Los terminos
deben coincidir con el catalogo de busqueda de precios de NestJS (`backend/src/prices/catalogo.ts`).
"""

from dataclasses import dataclass, field

# Unidades de medida. Cada alias apunta a (tipo, factor hacia la unidad base del tipo).
# Bases: masa = kg, volumen = l, conteo = un.
UNIDADES: dict[str, tuple[str, float]] = {
    # masa
    "kg": ("masa", 1.0),
    "kilo": ("masa", 1.0),
    "kilos": ("masa", 1.0),
    "kilogramo": ("masa", 1.0),
    "kilogramos": ("masa", 1.0),
    "g": ("masa", 0.001),
    "gr": ("masa", 0.001),
    "grs": ("masa", 0.001),
    "gramo": ("masa", 0.001),
    "gramos": ("masa", 0.001),
    "mg": ("masa", 0.000001),
    # volumen
    "l": ("volumen", 1.0),
    "lt": ("volumen", 1.0),
    "lts": ("volumen", 1.0),
    "litro": ("volumen", 1.0),
    "litros": ("volumen", 1.0),
    "ml": ("volumen", 0.001),
    "cc": ("volumen", 0.001),
    "mililitro": ("volumen", 0.001),
    "mililitros": ("volumen", 0.001),
    "cl": ("volumen", 0.01),
    "cucharada": ("volumen", 0.015),
    "cucharadas": ("volumen", 0.015),
    "cda": ("volumen", 0.015),
    "cdas": ("volumen", 0.015),
    "cucharadita": ("volumen", 0.005),
    "cucharaditas": ("volumen", 0.005),
    "cdita": ("volumen", 0.005),
    "cditas": ("volumen", 0.005),
    "taza": ("volumen", 0.24),
    "tazas": ("volumen", 0.24),
    "vaso": ("volumen", 0.2),
    "vasos": ("volumen", 0.2),
    # conteo
    "un": ("conteo", 1.0),
    "u": ("conteo", 1.0),
    "ud": ("conteo", 1.0),
    "uds": ("conteo", 1.0),
    "unid": ("conteo", 1.0),
    "unidad": ("conteo", 1.0),
    "unidades": ("conteo", 1.0),
    "pieza": ("conteo", 1.0),
    "piezas": ("conteo", 1.0),
    "diente": ("conteo", 1.0),
    "dientes": ("conteo", 1.0),
    "docena": ("conteo", 12.0),
    "docenas": ("conteo", 12.0),
}

UNIDAD_BASE_POR_TIPO = {"masa": "kg", "volumen": "l", "conteo": "un"}

# Palabras que describen el estado o el tamano del ingrediente y no cambian que producto es.
DESCRIPTORES = frozenset(
    {
        "fresco", "fresca", "frescos", "frescas", "grande", "grandes", "chico", "chica", "chicos",
        "chicas", "mediano", "mediana", "medianos", "medianas", "maduro", "madura", "maduros",
        "maduras", "picado", "picada", "picados", "picadas", "cortado", "cortada", "cortados",
        "cortadas", "pelado", "pelada", "pelados", "peladas", "cocido", "cocida", "cocidos",
        "cocidas", "finamente", "bien", "deshuesado", "deshuesada", "deshuesados", "deshuesadas",
        "entero", "entera", "enteros", "enteras",
    }
)  # fmt: skip


@dataclass(frozen=True)
class Termino:
    """Un ingrediente del catalogo de precios y como convertir sus cantidades."""

    nombre: str
    categoria: str
    unidad_base: str  # unidad en la que las tiendas expresan su precio unitario: kg, l o un
    sinonimos: tuple[str, ...] = field(default_factory=tuple)
    # kg que pesa una unidad (un tomate, un limon...). None si no hay un valor razonable.
    peso_unidad_kg: float | None = None
    # kg por litro: permite pasar tazas o cucharadas de un solido a kg. None si no aplica.
    densidad_kg_por_l: float | None = None
    # Palabras que, si aparecen en el nombre, indican OTRO producto ("leche condensada" no es
    # "leche"). Solo se aplican al mapeo por contencion, no a los sinonimos explicitos.
    excluye: tuple[str, ...] = field(default_factory=tuple)


CATALOGO: tuple[Termino, ...] = (
    Termino("arroz", "despensa", "kg", ("arroz grado 1", "arroz blanco", "arroz grano largo"),
            densidad_kg_por_l=0.85),
    Termino("fideos", "despensa", "kg", ("fideo", "tallarin", "espagueti", "spaghetti", "pasta",
                                         "macarron", "macarrones"), densidad_kg_por_l=0.4),
    Termino("harina", "despensa", "kg", ("harina de trigo", "harina sin polvos"),
            densidad_kg_por_l=0.5, excluye=("maiz", "almendra", "almendras", "coco")),
    Termino("azucar", "despensa", "kg", ("azucar blanca", "azucar granulada"),
            densidad_kg_por_l=0.83),
    Termino("aceite", "despensa", "l", ("aceite de oliva", "aceite vegetal", "aceite maravilla",
                                        "aceite de maravilla"), densidad_kg_por_l=0.91,
            excluye=("coco", "sesamo")),
    Termino("sal", "despensa", "kg", ("sal de mesa", "sal fina", "sal gruesa"),
            densidad_kg_por_l=1.2),
    Termino("lentejas", "despensa", "kg", ("lenteja",), densidad_kg_por_l=0.8),
    Termino("porotos", "despensa", "kg", ("poroto", "frejol", "frejoles", "frijol", "frijoles",
                                          "porotos negros"), densidad_kg_por_l=0.75),
    Termino("atun", "despensa", "kg", ("atun en lata", "atun al agua", "atun en aceite")),
    Termino("salsa de tomate", "despensa", "kg", ("pomarola", "salsa de tomates",
                                                  "salsa pomodoro", "pasta de tomate",
                                                  "pure de tomate"), densidad_kg_por_l=1.05),
    Termino("pollo", "carnes", "kg", ("pechuga de pollo", "trutro de pollo", "pollo entero",
                                      "muslo de pollo", "filete de pollo", "pechuga", "trutro")),
    Termino("carne molida", "carnes", "kg", ("carne picada", "carne molida de vacuno")),
    Termino("cerdo", "carnes", "kg", ("lomo de cerdo", "chuleta de cerdo", "costillar de cerdo")),
    Termino("merluza", "pescados", "kg", ("filete de merluza",)),
    Termino("salmon", "pescados", "kg", ("filete de salmon",)),
    Termino("tomate", "frutas y verduras", "kg", ("tomate cherry",), peso_unidad_kg=0.15),
    Termino("cebolla", "frutas y verduras", "kg", ("cebolla blanca", "cebolla morada"),
            peso_unidad_kg=0.2),
    Termino("papa", "frutas y verduras", "kg", ("patata",), peso_unidad_kg=0.15),
    Termino("zanahoria", "frutas y verduras", "kg", (), peso_unidad_kg=0.1),
    Termino("lechuga", "frutas y verduras", "un", ("lechuga hidroponica",), peso_unidad_kg=0.3),
    Termino("palta", "frutas y verduras", "kg", ("aguacate",), peso_unidad_kg=0.2),
    Termino("limon", "frutas y verduras", "kg", (), peso_unidad_kg=0.1),
    Termino("manzana", "frutas y verduras", "kg", ("manzana roja", "manzana verde"),
            peso_unidad_kg=0.18),
    Termino("platano", "frutas y verduras", "kg", ("banana",), peso_unidad_kg=0.12),
    Termino("zapallo", "frutas y verduras", "kg", ("zapallo camote",)),
    Termino("leche", "lacteos y huevos", "l", ("leche entera", "leche descremada",
                                               "leche semidescremada"), densidad_kg_por_l=1.03,
            excluye=("condensada", "evaporada", "coco", "chocolatada", "achocolatada")),
    Termino("huevos", "lacteos y huevos", "un", ("huevo", "huevo de gallina")),
    Termino("queso", "lacteos y huevos", "kg", ("queso gauda", "queso mantecoso", "queso rallado",
                                                "queso laminado")),
    Termino("mantequilla", "lacteos y huevos", "kg", ("mantequilla con sal",
                                                      "mantequilla sin sal"),
            densidad_kg_por_l=0.96),
    Termino("yogurt", "lacteos y huevos", "kg", ("yogur", "yoghurt", "yogurt natural"),
            densidad_kg_por_l=1.03),
    Termino("pan", "panaderia", "kg", ("marraqueta", "hallulla", "pan de molde", "pan molde",
                                       "pan marraqueta"), peso_unidad_kg=0.09),
)  # fmt: skip
