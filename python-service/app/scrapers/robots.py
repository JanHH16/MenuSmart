import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    allow: bool
    pattern: str
    regex: re.Pattern[str]

    @property
    def specificity(self) -> int:
        return len(self.pattern)


def _compile(pattern: str) -> re.Pattern[str]:
    """Convierte un patron de robots.txt (con '*' y '$') en una expresion regular.

    urllib.robotparser no soporta comodines, y el robots.txt de Jumbo los usa
    (por ejemplo '*?map=' o '*sc=*'), por eso se implementa aca.
    """
    anclado = pattern.endswith("$")
    cuerpo = pattern[:-1] if anclado else pattern
    regex = ".*".join(re.escape(parte) for parte in cuerpo.split("*"))
    return re.compile(regex + ("$" if anclado else ""))


def parse_robots(text: str, user_agent: str) -> list[Rule]:
    """Devuelve las reglas que aplican a `user_agent`.

    Si existe un grupo cuyo nombre esta contenido en el User-Agent se usa ese; si no,
    el grupo '*'. Si ninguno aplica, no hay restricciones.
    """
    grupos: list[tuple[list[str], list[tuple[bool, str]]]] = []
    agentes: list[str] = []
    reglas: list[tuple[bool, str]] = []
    en_reglas = False

    for linea_cruda in text.splitlines():
        linea = linea_cruda.split("#", 1)[0].strip()
        if not linea or ":" not in linea:
            continue
        campo, _, valor = linea.partition(":")
        campo = campo.strip().lower()
        valor = valor.strip()
        if campo == "user-agent":
            if en_reglas:
                grupos.append((agentes, reglas))
                agentes, reglas, en_reglas = [], [], False
            agentes.append(valor.lower())
        elif campo in ("allow", "disallow"):
            en_reglas = True
            if valor:
                reglas.append((campo == "allow", valor))
    if agentes:
        grupos.append((agentes, reglas))

    ua = user_agent.lower()
    especificos = [r for nombres, r in grupos if any(n != "*" and n in ua for n in nombres)]
    comodin = [r for nombres, r in grupos if "*" in nombres]
    elegidos = especificos or comodin

    return [
        Rule(allow=allow, pattern=pattern, regex=_compile(pattern))
        for grupo in elegidos
        for allow, pattern in grupo
    ]


def is_allowed(rules: list[Rule], path: str) -> bool:
    """Gana la regla mas especifica (patron mas largo); en empate gana Allow."""
    mejor: Rule | None = None
    for regla in rules:
        if not regla.regex.match(path):
            continue
        if (
            mejor is None
            or regla.specificity > mejor.specificity
            or (regla.specificity == mejor.specificity and regla.allow)
        ):
            mejor = regla
    return mejor is None or mejor.allow
