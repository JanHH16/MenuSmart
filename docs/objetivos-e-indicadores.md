# Objetivos e indicadores de utilidad

La observación de la EP1 pedía **relacionar los objetivos con indicadores de utilidad y definir cómo se comprobará que las recomendaciones reducen costos y desperdicios**. Este documento hace tres cosas:

1. Vincula cada objetivo del proyecto con indicadores medibles (fórmula, fuente del dato, meta).
2. Separa con claridad lo que **ya se midió** (con datos reales guardados) de lo que **requiere usuarios reales** y todavía no se midió.
3. Define el procedimiento de comprobación, incluido un protocolo de prueba con personas.

No se inventan resultados: lo que no se midió figura como pendiente.

## 1. Objetivos del proyecto

| Id | Objetivo | Problema que ataca (README) |
|---|---|---|
| O1 | Reducir el costo de la compra semanal | Sobregasto por no comparar tiendas ni precios |
| O2 | Reducir el desperdicio de alimentos | Se compran ingredientes que se usan en una sola receta y el resto sobra |
| O3 | Ahorrar tiempo de planificación | Armar el plan y la lista a mano consume tiempo y se hace desordenado |
| O4 | Que el usuario confíe en la información y en las sugerencias | Sugerencias opacas o precios desactualizados no se usan |

Cómo se logran: el comparador y el costo estimado por tienda atienden O1; el recomendador (costo por porción y reutilización de ingredientes) atiende O1 y O2; la lista de compras automática atiende O3; las explicaciones, la fecha de cada precio y las métricas de calidad atienden O4.

## 2. Indicadores

Estado: **Medido** (hay números reales y se puede repetir), **Medible hoy** (el dato ya se registra, falta recogerlo con uso real) o **Requiere usuarios** (hay que hacer la prueba de la sección 4).

| Id | Objetivo | Indicador | Fórmula | Fuente del dato | Meta propuesta | Estado |
|---|---|---|---|---|---|---|
| I1 | O1 | Reducción del costo de la canasta frente a una versión base | `(canasta_base - canasta_adaptativa) / canasta_base` | `npm run evaluar:recomendador` (simulación con precios reales) | Al menos 15% menos que la base aleatoria | **Medido** (25% a 56%, sección 3.1) |
| I2 | O1 | Costo medio por porción del menú | Promedio del costo por porción de las recetas del menú, con la tienda más barata por ingrediente | Misma simulación | Menor que el de la base en cada escenario | **Medido** |
| I3 | O1 | Ahorro de elegir la tienda más barata en la lista | `resumen.comparable.ahorro` de `GET /api/shopping-lists` (diferencia entre los totales por tienda, sobre ítems con precio en ambas) | `GET /api/shopping-lists` | Informativo (no es una meta del sistema) | **Medible hoy**, con la limitación de la sección 3.3 |
| I4 | O2 | Proporción de ingredientes de un solo uso | `ingredientes en una sola receta del menú / ingredientes distintos` | Simulación (proxy de desperdicio) | Al menos 10 puntos porcentuales menos que la base aleatoria | **Medido** (sección 3.1) |
| I5 | O2 | Ingredientes distintos del menú | Cantidad de productos diferentes a comprar | Simulación | Menor que la base | **Medido** |
| I6 | O2 | Desperdicio real reportado por el usuario | Respuesta a "¿cuántos ingredientes te sobraron esta semana?" (cuestionario, sección 4.3) | Prueba con usuarios | Menos ingredientes sobrantes con sugerencias que sin ellas | **Requiere usuarios** |
| I7 | O3 | Tiempo para armar plan y lista | Segundos desde abrir la app hasta tener la lista de compras de 5 comidas, con la app frente a hacerlo a mano | Cronómetro en la prueba | Al menos 30% menos que a mano | **Requiere usuarios** |
| I8 | O3 | Tasa de éxito de la tarea "armar la lista de la semana" | `usuarios que la completan sin ayuda / usuarios` | Observación en la prueba | Al menos 80% | **Requiere usuarios** |
| I9 | O1, O2 | Tasa de aceptación de sugerencias | `aceptadas / (aceptadas + rechazadas)` | Tabla `recomendacion_feedback` (sección 3.2) | Entre 30% y 70% (menos indica sugerencias poco útiles; más podría indicar que se acepta sin pensar) | **Medible hoy**, sin datos de uso real todavía |
| I10 | O4 | Utilidad percibida de las sugerencias | Promedio de la pregunta 1 del cuestionario (escala 1 a 5) | Prueba con usuarios | Promedio de 4 o más | **Requiere usuarios** |
| I11 | O4 | Comprensión de las explicaciones | Porcentaje de usuarios que explican correctamente por qué se sugirió una receta (pregunta 3 y verificación del evaluador) | Prueba con usuarios | Al menos 80% | **Requiere usuarios** |
| I12 | O4 | Frescura de los precios | Horas desde la última actualización exitosa, por tienda | `GET /api/prices/quality` (`horasDesdeActualizacion`) | Menos de 48 h (umbral `PRICES_STALE_HOURS`) | **Medido** (7,5 h, sección 3.3) |
| I13 | O4 | Calidad de los datos de precios | Porcentaje de registros válidos, duplicados, descartados y cobertura del catálogo | `GET /api/prices/quality` | Válidos 95% o más, descartados menos de 2%, cobertura 100% | **Medido** (ver [calidad-de-datos.md](calidad-de-datos.md)) |
| I14 | O4 | Disponibilidad y tiempos de respuesta | p50 y p95 por ruta, errores 5xx, estado de `/health` | `GET /api/metrics` (rama `feature/observability`) y `GET /health` | p95 menor que 1 s en rutas de lectura; 0 errores 5xx en la demo | **Medible hoy** |

Las metas son propuestas razonables para un proyecto académico, no compromisos contractuales. Se ajustan después de la primera prueba con usuarios.

## 3. Lo que ya se midió

### 3.1 Simulación del recomendador (O1, O2)

Detalle completo en [evaluacion-recomendador.md](evaluacion-recomendador.md). Resumen:

- **Qué se hizo:** un usuario simulado acepta 5 sugerencias de almuerzo o cena, de a una (como en la app), y se compara el menú resultante con dos versiones base no adaptativas: orden alfabético y elección aleatoria con semilla fija (promedio de 1.000 repeticiones).
- **Datos:** 1.946 precios vigentes de 1.590 productos reales de Jumbo y Santa Isabel, 21 recetas candidatas.
- **Reproducir:** `cd backend && npm run evaluar:recomendador` (necesita la base de datos con precios; ver [backend/README.md](../backend/README.md)).

| Indicador | Resultado |
|---|---|
| I1: canasta del menú adaptativo (60% costo, 40% reutilización) frente a la aleatoria | Entre 25% y 56% menos, según el escenario (semana vacía, plan de 2 recetas, plan de 3 recetas) |
| I1: frente a la alfabética | Entre 27% y 59% menos |
| I2: costo por porción, semana vacía | $494 (adaptativa) frente a $1.150 (aleatoria) y $1.251 (alfabética) |
| I4: ingredientes de un solo uso, semana vacía | 0% (adaptativa) frente a 56% (aleatoria) y 31% (alfabética) |
| I4: plan de 3 recetas | 33% con reutilización (60/40) frente a 36% solo con costo (100/0), 41% aleatoria y 33% alfabética |

**Cómo leerlo, con honestidad:**

- Ganar en costo es esperable, porque el sistema optimiza justamente el costo. Lo informativo es el efecto de la **reutilización**, que es lo que distingue al recomendador de "ordenar por precio". Ese efecto aparece solo cuando ya hay recetas en el plan: en el plan de 3 recetas, darle peso a la reutilización compra 2 ingredientes distintos menos, a cambio de una canasta 10% más cara que optimizando solo el costo. En la semana vacía y en el plan de 2 recetas no cambió el menú.
- **Es una simulación, no una medición con personas.** Demuestra que la adaptación hace lo que promete sobre los datos, no que a los usuarios les sirva ni que sigan las sugerencias.
- **El desperdicio es un proxy.** "Ingrediente de un solo uso" es lo que más probablemente sobra, pero no se conocen los tamaños de envase ni lo que el usuario ya tiene en casa.
- **Se pierde variedad**, que no se mide aquí (los menús adaptativos repiten legumbres, papas, arroz y huevos).
- Los precios cambian a diario: los números cambian al volver a ejecutar con precios nuevos.

### 3.2 Aceptación de sugerencias: dato que ya se registra (I9)

Cada vez que el usuario acepta o rechaza una sugerencia, `RecommendationsService` guarda una fila en `recomendacion_feedback` con la acción (`aceptada` o `rechazada`), una por usuario y receta ([entidad](../backend/src/recommendations/entities/recomendacion-feedback.entity.ts)). Con eso se puede calcular la tasa de aceptación:

```sql
SELECT accion, COUNT(*) AS veces
FROM recomendacion_feedback
GROUP BY accion;
-- tasa de aceptación = veces(aceptada) / (veces(aceptada) + veces(rechazada))
```

Limitaciones del dato: no se registran las sugerencias que se mostraron y se ignoraron (no hay "impresiones"), así que la tasa mide decisiones explícitas, no el alcance. Es una fila por usuario y receta, no un historial. Todavía no hay uso real que medir.

### 3.3 Calidad y actualidad de los precios (O4)

Valores reales del 22-11-2026, obtenidos de `GET /api/prices/quality` (detalle en [calidad-de-datos.md](calidad-de-datos.md)):

| Indicador | Jumbo | Santa Isabel |
|---|---|---|
| Registros válidos | 99,5% (1.075 de 1.080) | 95,8% (871 de 909) |
| Duplicados | 0,5% | 4,2% |
| Descartados | 0% | 0% |
| Tasa de errores de consultas | 0% | 0% |
| Cobertura del catálogo | 31 de 31 términos | 31 de 31 términos |
| Horas desde la actualización | 7,5 | 7,5 |

Limitaciones: se basa en **una sola ejecución por tienda** (la ventana es de las últimas 10, hoy hay 1), así que no muestra tendencia.

Sobre I3: el ahorro entre tiendas que informa la lista solo suma los ítems con precio en ambas, y depende de que el producto elegido sea representativo. En la prueba real, un producto poco representativo (un picado infantil con zanahoria) distorsionó el total de una tienda; el detalle está en la sección 7.2 de [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md). Como dato exploratorio, entre los 26 términos que se pueden comparar por precio unitario, la diferencia mediana entre tiendas fue 7,3% y la media 20,4%, pero compara productos distintos y no debe leerse como un ahorro garantizado.

## 4. Cómo se comprobará que las recomendaciones reducen costos y desperdicios

Hay tres niveles de evidencia, de menos a más fuerte. Cada uno responde una pregunta distinta.

| Nivel | Pregunta | Método | Estado |
|---|---|---|---|
| 1. Simulación | ¿El recomendador arma menús más baratos y con menos ingredientes de un solo uso que una versión sin adaptación? | `npm run evaluar:recomendador`, comparación con base alfabética y aleatoria | **Hecho** (sección 3.1) |
| 2. Uso registrado | ¿Los usuarios aceptan lo que se sugiere? | Tasa de aceptación desde `recomendacion_feedback` | Medible, falta uso real |
| 3. Prueba con personas | ¿Las personas gastan menos, desperdician menos, entienden y confían? | Protocolo de la sección 4.1 | **Pendiente: lo debe ejecutar el equipo** |

Solo el nivel 3 puede sostener la afirmación "las recomendaciones reducen costos y desperdicios en la práctica". Los niveles 1 y 2 sostienen que el sistema hace lo diseñado y que se usa.

### 4.1 Protocolo de prueba con 5 a 10 personas

**Participantes:** 5 a 10 personas que cocinen en casa y hagan compras de supermercado (estudiantes, parejas o familias). Con menos de 5 no se ve ningún patrón; con más de 10 el esfuerzo no se justifica para este curso. Los resultados serán cualitativos y orientativos, no estadísticamente significativos.

**Diseño (cada persona hace las dos condiciones, en orden alternado para no sesgar):**

- **Condición A (base):** sugerencias con la adaptación desactivada (`adaptativo=false` en `GET /api/recommendations`, orden alfabético). La API lo soporta; si la pantalla de sugerencias no ofrece ese interruptor, el evaluador debe activarlo por la API o con una versión de prueba. La persona arma un plan de 5 comidas para la semana.
- **Condición B (adaptativa):** la misma pantalla con la adaptación activada. La persona arma un plan de 5 comidas.

Alternar el orden: la mitad empieza por A y la otra mitad por B. Usar plantillas de comidas equivalentes en ambas.

**Tarea:** armar un plan de 5 comidas, generar la lista de compras y revisar el costo estimado. Se pide pensar en voz alta.

**Qué se registra por persona y condición:**

| Dato | Cómo se obtiene | Indicador |
|---|---|---|
| Costo estimado de la canasta | Campo `resumen.comparable.totales` de la lista (o la canasta del menú) | I1 |
| Ingredientes distintos y de un solo uso | Contados de la lista | I4, I5 |
| Tiempo hasta tener la lista | Cronómetro | I7 |
| Si completó la tarea sin ayuda | Observación | I8 |
| Sugerencias aceptadas, rechazadas y ajustes de "importancia del costo" | Tabla `recomendacion_feedback` y observación | I9 |
| Respuestas al cuestionario | Sección 4.3 | I6, I10, I11 |

**Análisis:** comparar A con B por persona (diferencia de costo, de ingredientes de un solo uso y de tiempo) y reportar mediana y rango, no solo el promedio. Reportar también los casos en que B fue peor. Registrar quién fue (sin datos personales), la fecha y los precios vigentes ese día.

**Consentimiento y privacidad:** informar el objetivo, que no se graban datos personales, que pueden abandonar cuando quieran, y usar cuentas de prueba creadas para la sesión. No guardar nombres junto con las respuestas.

### 4.2 Qué evidencia se anexará

Una tabla con los datos por persona y condición, el cuestionario respondido (anonimizado), las capturas de la pantalla de sugerencias en cada condición y una conclusión con las limitaciones (muestra pequeña, tareas guiadas, precios de un día).

### 4.3 Cuestionario breve (5 preguntas)

Responder después de la condición B. Escala de 1 (muy en desacuerdo) a 5 (muy de acuerdo), salvo la pregunta 5.

1. Las recetas sugeridas me parecieron útiles para armar mi semana.
2. El costo estimado me ayudó a decidir qué comprar.
3. Entendí por qué el sistema me sugirió cada receta (puedes explicarlo con tus palabras).
4. Sentí que podía cambiar, rechazar o ignorar las sugerencias cuando quise.
5. Con esta forma de planificar, ¿cuántos ingredientes crees que te sobrarían en la semana, comparado con lo que haces normalmente? (muchos más, algo más, igual, algo menos, muchos menos).

Cierre abierto opcional: "¿Qué cambiarías?".

Correspondencia: pregunta 1 con I10, pregunta 3 con I11 (se verifica con la explicación hablada), pregunta 4 con el control del usuario (transparencia), pregunta 5 con I6, pregunta 2 con O1.

## 5. Resumen de estado

| Qué | Estado |
|---|---|
| Objetivos vinculados a indicadores con fórmula, fuente y meta | Hecho (este documento) |
| Evidencia en simulación (costo y desperdicio proxy) | Hecho, con números reales |
| Calidad y actualidad de datos | Hecho, con números reales |
| Tasa de aceptación | El dato se registra; falta uso real |
| Prueba con personas (utilidad, comprensión, tiempo, desperdicio real) | Pendiente: protocolo y cuestionario definidos, sin resultados |
| Mejoras de precisión de la estimación de costo | Trabajo futuro (ver limitaciones en [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md)) |
