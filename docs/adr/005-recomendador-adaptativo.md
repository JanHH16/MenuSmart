# ADR-005: Recomendador adaptativo basado en reglas y puntaje

**Estado:** Aceptado
**Fecha:** 2026-11-22

## Contexto

El enunciado exige una capacidad adaptativa o inteligente que se pueda **demostrar y evaluar**, y aclara que no es obligatorio usar inteligencia artificial generativa: una solución basada en reglas, políticas o recomendación es válida si está justificada, implementada y evaluada (sección 23).

El problema del proyecto es gastar menos y desperdiciar menos al planificar la compra semanal. La información web (precios de Jumbo y Santa Isabel) debe cumplir una función real dentro de la solución, no solo mostrarse.

Condiciones de partida:

- Es un proyecto nuevo: **no hay historial de uso** ni usuarios reales cuando se toma la decisión.
- El equipo son dos personas y la defensa es individual: cada decisión debe poder explicarse.
- El usuario debe poder entender, aceptar, modificar o rechazar lo que se le sugiere.

## Decisión

Sugerir recetas con una **política de reglas y puntaje ponderado** con dos variables:

1. **Costo por porción** de la receta, calculado con los precios vigentes de las dos tiendas.
2. **Reutilización de ingredientes** que el usuario ya tiene en el plan de la semana.

Fórmula (detalle en [capacidad-adaptativa.md](../capacidad-adaptativa.md)):

```
puntaje = pesoCosto x costoNormalizado + (1 - pesoCosto) x reuso        (pesoCosto = 0,6 por defecto)
```

El usuario puede cambiar el peso, excluir ingredientes, rechazar recetas y desactivar la adaptación. Cada sugerencia incluye una explicación en palabras. La implementación está en `backend/src/recommendations/`.

## Alternativas consideradas

Criterios: **datos necesarios** (hay que poder funcionar sin historial), **transparencia** (explicable al usuario y al evaluador), **evaluabilidad** (comparable con una base), **riesgo** (sesgo, privacidad), **esfuerzo** (viable en el plazo) y **adecuación al problema** (ataca costo y desperdicio).

| Alternativa | Datos necesarios | Transparencia | Evaluabilidad | Riesgo | Esfuerzo | Veredicto |
|---|---|---|---|---|---|---|
| **Reglas y puntaje (elegida)** | Ninguno histórico: usa precios y el plan de la semana | Alta: la fórmula cabe en una línea y la explicación sale de los mismos términos | Alta: se compara contra orden alfabético y aleatorio con precios reales | Sesgo hacia lo barato, declarado y controlable | Bajo | Elegida |
| Filtrado colaborativo (usuarios parecidos) | Muchos usuarios con historial. Hoy: ninguno | Baja ("a otros como tú les gustó") | Difícil sin usuarios | Mayor: requiere perfilar a las personas | Medio | Descartada: arranque en frío sin solución |
| Modelo de aprendizaje automático (clasificación o predicción de preferencias) | Un conjunto de datos etiquetado que no existe | Baja | Se podría evaluar, pero con datos sintéticos que no demuestran nada sobre el problema real | Sesgo difícil de ver; más datos personales | Alto | Descartada: sin datos, el modelo sería decorativo |
| IA generativa (un LLM propone menús) | Ninguno, pero depende de un tercero | Baja, y puede inventar costos o cantidades | Difícil: resultados no deterministas | Envía datos a un tercero; costo por consulta | Medio | Descartada: no puede garantizar costos reales ni ser reproducible |
| Solo ordenar por precio | Precios | Alta | Alta | Repite siempre lo más barato, ignora el desperdicio | Muy bajo | Descartada: no ataca el desperdicio, solo es "un orden" |
| Búsqueda semántica o RAG sobre recetas | Un corpus de recetas | Media | Media | Costo y complejidad | Alto | Descartada: el problema no es encontrar recetas, es combinarlas con costo y reutilización |

## Por qué las reglas son la mejor respuesta aquí

- **Hay un dato real y propio que usar:** los precios. Un recomendador basado en ellos es útil desde el primer usuario, sin historial.
- **Es evaluable de forma honesta contra una base** ([evaluacion-recomendador.md](../evaluacion-recomendador.md)): la versión no adaptativa (orden alfabético y aleatorio) permite medir qué aporta la adaptación.
- **Es transparente por construcción:** lo que se explica al usuario es exactamente lo que se calcula.
- **Es controlable:** el peso del costo, las exclusiones, los rechazos y el interruptor de adaptación son controles reales, no decorativos.
- **Minimiza datos personales:** solo se guarda qué receta se aceptó o rechazó.

## Consecuencias

**Positivas**

- Funciona sin datos históricos y es determinista (a igual puntaje, orden alfabético), lo que facilita las pruebas (`scoring.spec.ts`).
- La evaluación es reproducible (`npm run evaluar:recomendador`).

**Negativas y riesgos aceptados**

- **No aprende.** Las aceptaciones se registran pero no influyen en el orden; solo los rechazos ocultan recetas. Con uso real se podría ajustar, y está anotado como trabajo futuro.
- **Los pesos son una decisión de diseño** (60% costo, 40% reutilización), no un valor entrenado.
- **Sesgo hacia lo barato:** tiende a menús con legumbres, papas, arroz y huevos, y a repetir platos. Se mitiga con los controles, pero la variedad no se mide.
- **Catálogo acotado:** 25 recetas y 31 ingredientes; no cubre dietas ni restricciones alimentarias.
- **Calidad del costo:** depende de la normalización de ingredientes y de una heurística de relevancia de productos, que puede elegir un producto poco representativo ([normalizacion-de-ingredientes.md](../normalizacion-de-ingredientes.md)).
- **La evidencia es una simulación**, no una medición con personas. La utilidad percibida y la comprensión de las explicaciones están pendientes de una prueba con usuarios ([objetivos-e-indicadores.md](../objetivos-e-indicadores.md)).

## Cuándo revisar esta decisión

- Si hay uso real suficiente (por ejemplo, decenas de usuarios con aceptaciones y rechazos), evaluar un ajuste de pesos o una señal de preferencia, manteniendo la explicación.
- Si el catálogo de recetas crece o el usuario aporta las suyas, revisar la normalización del costo (hoy relativa al conjunto filtrado).
- Si se agregan restricciones alimentarias, deben tratarse como filtros duros previos al puntaje, no como un peso más.
