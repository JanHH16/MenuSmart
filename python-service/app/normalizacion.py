"""Normalizacion de ingredientes: del texto libre del usuario a algo que se pueda sumar y valorizar.

Pasos, en orden (cada paso deja una regla en `reglas` para poder explicar el resultado):

1. Limpieza del nombre: minusculas, sin tildes, sin parentesis ni puntuacion, sin descriptores
   de estado o tamano ("fresco", "picado", "grande").
2. Mapeo al catalogo de precios: coincidencia exacta con un termino o sinonimo; luego con la
   forma singular; luego por contencion (todas las palabras de un sinonimo estan en el nombre,
   gana el sinonimo mas largo). Si nada coincide, el ingrediente queda sin termino.
3. Conversion de unidades a la base (kg, l o un) y, si el termino se vende en otra base,
   conversion con su densidad o su peso por unidad cuando existen.
4. Union de lineas que quedaron con el mismo termino (o nombre) y la misma unidad.

Limitacion conocida: el mapeo es lexico, no semantico. Algunos terminos declaran palabras que
indican otro producto (`excluye`: "condensada" para la leche), pero la lista es corta y manual.
"""

import re
import unicodedata
from dataclasses import dataclass, field

from app.normalizacion_datos import (
    CATALOGO,
    DESCRIPTORES,
    UNIDAD_BASE_POR_TIPO,
    UNIDADES,
    Termino,
)

DECIMALES = 4


def limpiar_texto(texto: str) -> str:
    """Minusculas, sin tildes, sin parentesis ni puntuacion y con espacios simples."""
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn"
    )
    sin_parentesis = re.sub(r"\([^)]*\)", " ", sin_tildes)
    solo_palabras = re.sub(r"[^a-z0-9\s]", " ", sin_parentesis)
    return " ".join(solo_palabras.split())


def _formas_singulares(palabra: str) -> list[str]:
    formas = [palabra]
    if palabra.endswith("es") and len(palabra) > 4:
        formas.append(palabra[:-2])
    if palabra.endswith("s") and len(palabra) > 3:
        formas.append(palabra[:-1])
    return formas


def _construir_indice() -> dict[str, Termino]:
    indice: dict[str, Termino] = {}
    for termino in CATALOGO:
        for frase in (termino.nombre, *termino.sinonimos):
            indice[limpiar_texto(frase)] = termino
    return indice


_INDICE = _construir_indice()
# Del sinonimo mas largo al mas corto, para que "salsa de tomate" gane a "tomate".
_CLAVES_POR_LARGO = sorted(_INDICE, key=lambda clave: (-len(clave.split()), clave))


def buscar_termino(nombre_limpio: str) -> tuple[Termino | None, str | None]:
    """Devuelve el termino del catalogo para un nombre ya limpio y la regla que lo encontro."""
    todas = nombre_limpio.split()
    palabras = [p for p in todas if p not in DESCRIPTORES]
    # Primero el nombre completo (hay sinonimos con descriptores, como "carne picada") y
    # despues sin descriptores ("cebolla fresca picada" -> "cebolla").
    frases = list(dict.fromkeys([nombre_limpio, " ".join(palabras)]))
    if not any(frases):
        return None, None

    for frase in frases:
        if frase in _INDICE:
            return _INDICE[frase], "nombre:exacto"

    # La forma singular de la frase completa ("tomates" -> "tomate", "limones" -> "limon").
    for frase in frases:
        for forma in _formas_singulares(frase):
            if forma in _INDICE:
                return _INDICE[forma], "nombre:singular"

    palabras_con_singular = {forma for p in todas for forma in _formas_singulares(p)}
    for clave in _CLAVES_POR_LARGO:
        if set(clave.split()) <= palabras_con_singular:
            termino = _INDICE[clave]
            # "leche condensada" contiene "leche" pero es otro producto: no se mapea.
            if palabras_con_singular & set(termino.excluye):
                continue
            return termino, f"nombre:contiene({clave})"
    return None, None


def _clave_unidad(unidad: str) -> str:
    return limpiar_texto(unidad).replace(" ", "")


def convertir_cantidad(
    cantidad: float, unidad: str, termino: Termino | None
) -> tuple[float, str, list[str]]:
    """Lleva la cantidad a kg, l o un y, si se puede, a la base en que se vende el termino."""
    clave = _clave_unidad(unidad)
    equivalencia = UNIDADES.get(clave)
    if equivalencia is None:
        return cantidad, clave or unidad.strip().lower(), [f"unidad:desconocida({clave})"]

    tipo, factor = equivalencia
    base = UNIDAD_BASE_POR_TIPO[tipo]
    valor = cantidad * factor
    reglas: list[str] = []
    if clave != base:
        reglas.append(f"unidad:{clave}->{base}(x{factor:g})")

    if termino is None or base == termino.unidad_base:
        return valor, base, reglas

    destino = termino.unidad_base
    densidad = termino.densidad_kg_por_l
    peso = termino.peso_unidad_kg
    convertido: float | None = None
    detalle = ""
    if base == "kg" and destino == "l" and densidad:
        convertido, detalle = valor / densidad, f"densidad({densidad:g}kg/l)"
    elif base == "l" and destino == "kg" and densidad:
        convertido, detalle = valor * densidad, f"densidad({densidad:g}kg/l)"
    elif base == "un" and destino == "kg" and peso:
        convertido, detalle = valor * peso, f"peso_unidad({peso:g}kg)"
    elif base == "kg" and destino == "un" and peso:
        convertido, detalle = valor / peso, f"peso_unidad({peso:g}kg)"
    elif base == "l" and destino == "un" and peso and densidad:
        convertido, detalle = valor * densidad / peso, "densidad_y_peso_unidad"

    if convertido is None:
        reglas.append(f"equivalencia:faltante({base}->{destino})")
        return valor, base, reglas
    reglas.append(f"equivalencia:{base}->{destino}[{detalle}]")
    return convertido, destino, reglas


@dataclass
class IngredienteEntrada:
    nombre: str
    cantidad: float
    unidad: str


@dataclass
class IngredienteNormalizado:
    nombre: str
    cantidad: float
    unidad: str
    termino: str | None
    categoria: str | None
    reglas: list[str] = field(default_factory=list)
    nombres_originales: list[str] = field(default_factory=list)
    lineas_unidas: int = 1


def normalizar_ingredientes(entrada: list[IngredienteEntrada]) -> list[IngredienteNormalizado]:
    """Normaliza y une las lineas de ingredientes. Conserva el orden de primera aparicion."""
    unidos: dict[tuple[str, str], IngredienteNormalizado] = {}
    for linea in entrada:
        limpio = limpiar_texto(linea.nombre)
        termino, regla_nombre = buscar_termino(limpio)
        cantidad, unidad, reglas = convertir_cantidad(linea.cantidad, linea.unidad, termino)
        if regla_nombre:
            reglas.insert(0, regla_nombre)

        nombre = termino.nombre if termino else limpio
        clave = (nombre, unidad)
        existente = unidos.get(clave)
        if existente is None:
            unidos[clave] = IngredienteNormalizado(
                nombre=nombre,
                cantidad=cantidad,
                unidad=unidad,
                termino=termino.nombre if termino else None,
                categoria=termino.categoria if termino else None,
                reglas=list(dict.fromkeys(reglas)),
                nombres_originales=[linea.nombre.strip()],
            )
            continue
        existente.cantidad += cantidad
        existente.lineas_unidas += 1
        existente.reglas = list(dict.fromkeys([*existente.reglas, *reglas]))
        if linea.nombre.strip() not in existente.nombres_originales:
            existente.nombres_originales.append(linea.nombre.strip())

    for item in unidos.values():
        item.cantidad = round(item.cantidad, DECIMALES)
    return list(unidos.values())
