# Capacidad adaptativa: recomendador de recetas

La sección 23 del enunciado exige responder nueve preguntas sobre la capacidad adaptativa. Este documento las responde una por una, con referencia al código que lo respalda.

**Resumen.** MenuSmart sugiere recetas para la semana ordenadas por **costo por porción** (con precios reales de Jumbo y Santa Isabel) y por **reutilización de los ingredientes que el usuario ya planificó**. Explica cada sugerencia, deja al usuario ajustar la importancia del costo, excluir ingredientes, rechazar recetas o desactivar la adaptación, y se evalúa contra una versión base sin adaptación. El mecanismo es una **política de reglas con puntaje**, no aprendizaje automático (justificación en [ADR-005](adr/005-recomendador-adaptativo.md)).

| Pieza | Archivo |
|---|---|
| Puntaje, costo de receta, métricas del menú | [`backend/src/recommendations/scoring.ts`](../backend/src/recommendations/scoring.ts) |
| Orquestación, filtros, aceptar y rechazar | [`backend/src/recommendations/recommendations.service.ts`](../backend/src/recommendations/recommendations.service.ts) |
| Catálogo de recetas | [`backend/src/recommendations/recetas.ts`](../backend/src/recommendations/recetas.ts) |
| Endpoints | [`recommendations.controller.ts`](../backend/src/recommendations/recommendations.controller.ts) y [`dto/recommendation.dto.ts`](../backend/src/recommendations/dto/recommendation.dto.ts) |
| Lo que se recuerda del usuario | [`entities/recomendacion-feedback.entity.ts`](../backend/src/recommendations/entities/recomendacion-feedback.entity.ts) |
| Evaluación | [`evaluacion-recomendador.md`](evaluacion-recomendador.md), [`backend/scripts/evaluar-recomendador.ts`](../backend/scripts/evaluar-recomendador.ts) |
| Pruebas | [`scoring.spec.ts`](../backend/src/recommendations/scoring.spec.ts) y [`backend/test/recommendations.e2e-spec.ts`](../backend/test/recommendations.e2e-spec.ts) |

## 1. ¿Qué componente se adapta?

El **orden y la selección de las recetas sugeridas** para la semana (`GET /api/recommendations`). La salida visible es una lista de recetas con su costo por porción, el costo por tienda, los ingredientes que reutiliza del plan y una explicación en palabras. Se muestra en la pantalla de sugerencias del plan semanal.

No se adapta la interfaz, la navegación ni las notificaciones; la adaptación es del contenido (qué se sugiere y en qué orden).

## 2. ¿A quién o a qué se adapta?

A dos cosas:

- **Al usuario y su semana:** a lo que ya planificó (sus comidas de la semana, de las que se extraen los ingredientes), y a lo que decidió sobre las sugerencias (rechazos persistentes, exclusiones y peso del costo).
- **Al mercado:** a los **precios vigentes** de Jumbo y Santa Isabel, que cambian en cada actualización. Es el uso funcional de la información web: sin precios no hay costo por porción, y las recetas sin precios suficientes pasan al final con un aviso.

## 3. ¿Qué variables activan la adaptación?

| Variable | De dónde sale | Cómo influye |
|---|---|---|
| Precios vigentes por producto y tienda | Tabla `precios_supermercado` (scraping) | Costo de cada receta con la tienda más barata para cada ingrediente |
| Ingredientes del plan de la semana | Comidas del usuario, normalizadas por el servicio Python ([normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md)) | Define qué ingredientes se "reutilizan" |
| Importancia del costo (`pesoCosto`, 0 a 100, por defecto 60) | Control del usuario | Reparte el peso entre costo y reutilización |
| Ingredientes excluidos (`excluir`) | Control del usuario | Oculta recetas que los contienen |
| Recetas rechazadas | Tabla `recomendacion_feedback` | Ocultan la receta hasta restablecer |
| Tipo de comida (`tipo`) y cantidad (`limite`, por defecto 10) | Parámetros de la consulta | Filtran el catálogo |
| `adaptativo` (por defecto `true`) | Control del usuario | Con `false` devuelve el orden base |

**Lo que no se usa** (se dice para no sobreafirmar): perfil, edad, ubicación, hora, historial de compras, valoraciones de recetas ni lo que el usuario aceptó antes. Las aceptaciones se registran pero **no influyen** en el orden (solo los rechazos lo hacen).

## 4. ¿Qué decisión toma el sistema?

Decide, para cada receta candidata, **cuánto conviene sugerirla ahora** y las ordena. Concretamente:

1. Filtra: quita las rechazadas, las que tienen un ingrediente excluido y las de otro tipo.
2. Calcula el costo de cada receta con los precios vigentes.
3. Calcula el puntaje y ordena de mayor a menor (a igual puntaje, orden alfabético: es determinista).
4. Entrega las primeras `limite`, cada una con su explicación.

El sistema **sugiere; no actúa solo**. Nada se agrega al plan sin que el usuario acepte.

## 5. ¿Qué mecanismo se utiliza?

Una **política de reglas con puntaje ponderado** (recomendación basada en contenido y costo). Es transparente, determinista y no necesita datos históricos de muchos usuarios.

### 5.1 Costo de una receta (`costoDeReceta`)

Para cada ingrediente se calcula su costo en cada tienda con la misma lógica de la lista de compras ([`costo.ts`](../backend/src/shopping-lists/costo.ts)): solo productos relevantes y con precio unitario en la misma unidad que la receta. Después:

- `total` = suma, para cada ingrediente, del **menor** costo entre las dos tiendas (comprar cada cosa donde es más barata).
- `porPorcion` = `total / porciones`.
- `porTienda` = costo comprando todo en una sola tienda; `null` si a esa tienda le falta algún ingrediente.
- `cobertura` = fracción de ingredientes con precio en al menos una tienda. `sinPrecio` lista los que no tienen.

### 5.2 Puntaje (`puntuar`)

Las recetas con `cobertura` de al menos **0,7** (`COBERTURA_MINIMA`) se consideran valorizables. Para ellas:

```
costoNormalizado = 1 - (costoPorPorcion - minimo) / (maximo - minimo)     # 1 = la más barata del conjunto
                 = 1                                                       # si todas cuestan lo mismo
reuso            = ingredientes de la receta que ya están en el plan / ingredientes de la receta
puntaje          = pesoCosto x costoNormalizado + pesoReuso x reuso
```

donde `minimo` y `maximo` son el menor y el mayor costo por porción **entre las recetas valorizables que quedaron después de los filtros**. Para una receta **sin precios suficientes**: `puntaje = pesoReuso x reuso x 0,5`, de modo que no compite con las valorizables y queda al final.

### 5.3 Pesos

`pesosDesdeCosto(pesoCosto)` convierte la importancia del costo (0 a 100, recortada a ese rango) en dos pesos que suman 1: `costo = pesoCosto / 100` y `reuso = 1 - costo`.

| `pesoCosto` | Peso del costo | Peso de la reutilización | Uso |
|---|---|---|---|
| 100 | 1,0 | 0,0 | Solo importa el precio |
| **60 (por defecto)** | **0,6** | **0,4** | Equilibrio elegido como punto de partida |
| 30 | 0,3 | 0,7 | Prioriza reutilizar ingredientes |
| 0 | 0,0 | 1,0 | Solo importa reutilizar |

Los pesos 60/40 son una decisión de diseño, no un valor ajustado con datos: la evaluación compara 100/0, 60/40 y 30/70 (ver sección 8) y el usuario puede moverlos.

### 5.4 Por qué estas dos variables

- **Costo por porción:** atiende el objetivo de gastar menos y usa directamente la información web.
- **Reutilización de ingredientes:** atiende el desperdicio. Un ingrediente que se compra para una sola receta es el que más probablemente sobra; reutilizarlo reduce la cantidad de productos distintos que hay que comprar.

### 5.5 Ejemplo real

Datos reales del 22-11-2026, usuario de prueba, `GET /api/recommendations?limite=3`.

**Semana vacía:**

| Receta | Costo por porción | Puntaje | Explicación |
|---|---|---|---|
| Panqueques | $318 | 0,600 | Cuesta $318 por porción, 71% menos que el promedio de las recetas. Aún no tienes comidas en la semana, así que no se puede medir qué ingredientes reutilizar. |
| Lentejas con arroz | $494 | 0,533 | Cuesta $494 por porción, 54% menos que el promedio. |
| Tallarines con salsa de tomate | $614 | 0,487 | Cuesta $614 por porción, 43% menos que el promedio. |

(Panqueques: costo normalizado 1, reutilización 0, puntaje = 0,6 x 1 + 0,4 x 0 = 0,6.)

**Después de aceptar "Arroz con pollo" para el lunes** (plan: aceite, arroz, cebolla, pollo, zanahoria):

| Receta | Costo por porción | Puntaje | Explicación |
|---|---|---|---|
| Lentejas con arroz | $494 | 0,853 | Cuesta $494 por porción, 54% menos que el promedio. Reutiliza 4 de 5 ingredientes de tu semana (arroz, zanahoria, cebolla, aceite), así compras menos productos distintos. |
| Arroz con pollo | $1.073 | 0,711 | Cuesta $1.073 por porción, cerca del promedio. Reutiliza 5 de 5 ingredientes de tu semana. |
| Arroz con huevo y ensalada | $762 | 0,670 | Cuesta $762 por porción, 29% menos que el promedio. Reutiliza 3 de 5. |

Se ve el efecto de la adaptación: las recetas que comparten ingredientes con el plan suben. También se ve una limitación: **"Arroz con pollo", que ya está en el plan, sigue apareciendo como sugerencia** (el recomendador no excluye lo ya planificado).

**Con la adaptación desactivada** (`adaptativo=false`): orden alfabético, `puntaje: null` y la explicación "Orden alfabético: la adaptación está desactivada." (primeras tres: Arroz con huevo y ensalada, Arroz con pollo, Atún con arroz y ensalada).

**Con `pesoCosto=100&excluir=pollo`:** pesos 1,0 y 0; se descartaron 4 recetas por contener pollo; la primera es Panqueques (puntaje 1).

## 6. ¿Cómo puede el usuario comprender la decisión?

- **Cada sugerencia trae su explicación** (`explicacion`): cuánto cuesta por porción y cómo se compara con el promedio de las recetas (más barata, similar o más cara, con el porcentaje), cuántos ingredientes reutiliza del plan y cuáles, y avisos cuando faltan precios ("Sin precio para X: el costo es un mínimo") o cuando todavía no hay plan para medir la reutilización.
- **La respuesta incluye los datos de la decisión:** `puntaje`, `pesos` usados, `ingredientesDelPlan`, `ingredientesCompartidos` y `ingredientesNuevos` de cada receta, `costoPorTienda`, `cobertura`, `sinPrecio` y cuántas recetas se dejaron fuera por rechazo o exclusión (`descartadas`).
- **Los precios muestran su procedencia y fecha** (`preciosActualizadosEn` por tienda).
- **La fórmula es pública** (esta página) y simple de explicar: "baratas y que aprovechan lo que ya compraste".

## 7. ¿Cómo puede aceptar, modificar o rechazar la adaptación?

| Acción del usuario | Cómo | Efecto | ¿Persiste? |
|---|---|---|---|
| Aceptar una sugerencia | `POST /api/recommendations/accept` (receta, día, tipo opcional) | La receta se agrega al plan con sus ingredientes y se registra `aceptada` | Sí (comida y feedback) |
| Rechazar una sugerencia | `POST /api/recommendations/reject` | Deja de mostrarse | Sí (`recomendacion_feedback`) |
| Volver a ver las rechazadas | `DELETE /api/recommendations/feedback` | Se borran los rechazos del usuario | Sí |
| Cambiar la importancia del costo | `pesoCosto` (0 a 100) | Cambia el balance costo y reutilización | No: es un parámetro de la consulta |
| Excluir ingredientes | `excluir=pollo,queso` (términos del catálogo) | Oculta las recetas que los contienen | No: parámetro de la consulta |
| Filtrar por tipo y limitar | `tipo`, `limite` | Reduce la lista | No |
| **Desactivar la adaptación** | `adaptativo=false` | Orden alfabético, sin puntaje | No |
| Ignorar | No hacer nada | El plan no cambia | n/a |

Los controles existen y se validan en el backend (rangos, términos del catálogo, ids de receta). La pantalla de sugerencias del frontend, que se construye en otra rama, es la que los presenta al usuario; este documento no describe su interfaz, y cuál de los controles ofrece la pantalla (por ejemplo, el interruptor de adaptación) debe confirmarse con el frontend entregado.

## 8. ¿Cómo se evalúa su utilidad?

Tres niveles (detalle y protocolo en [objetivos-e-indicadores.md](objetivos-e-indicadores.md)):

1. **Simulación contra la versión base (hecha).** [evaluacion-recomendador.md](evaluacion-recomendador.md) compara un menú de 5 recetas aceptadas de a una con dos bases no adaptativas (alfabética y aleatoria con semilla fija, promedio de 1.000 repeticiones), con precios reales (1.946 precios, 21 recetas candidatas). Resultados principales:

   | Escenario | Estrategia | Costo por porción | Canasta | Ingredientes distintos | De un solo uso |
   |---|---|---|---|---|---|
   | Semana vacía | Base alfabética | $1.251 | $24.250 | 13 | 31% |
   | Semana vacía | Base aleatoria | $1.150 | $22.491 | 14,4 | 56% |
   | Semana vacía | Adaptativa 60/40 | $494 | $9.880 | 5 | 0% |
   | Plan de 3 recetas | Base alfabética | $1.218 | $38.222 | 15 | 33% |
   | Plan de 3 recetas | Base aleatoria | $1.191 | $37.494 | 16,5 | 41% |
   | Plan de 3 recetas | Adaptativa solo costo (100/0) | $797 | $25.509 | 11 | 36% |
   | Plan de 3 recetas | Adaptativa 60/40 | $1.002 | $27.939 | 9 | 33% |

   La canasta adaptativa 60/40 cuesta entre 25% y 56% menos que la aleatoria y entre 27% y 59% menos que la alfabética. Se aclara que ganar en costo es esperable (el sistema lo optimiza). Lo informativo es que, con recetas ya en el plan, la reutilización compra 2 ingredientes distintos menos a cambio de una canasta 10% más cara que optimizando solo el costo.

2. **Pruebas automáticas.** `scoring.spec.ts` verifica que con peso total al costo gana la receta más barata, que con peso total a la reutilización gana la que comparte ingredientes, que las recetas sin precio van al final con aviso, que el orden es determinista y que el orden base ignora precios. `recommendations.e2e-spec.ts` verifica autenticación, validación, explicación, efecto del peso, `adaptativo=false`, exclusiones, rechazo y restablecimiento, aceptación y que, si el servicio Python no responde, igual recomienda sin medir la reutilización.

3. **Prueba con usuarios (pendiente).** Tasa de aceptación, utilidad percibida y comprensión de las explicaciones requieren personas reales; el protocolo está en [objetivos-e-indicadores.md](objetivos-e-indicadores.md), sin resultados todavía.

Para repetir la simulación: `cd backend && npm run evaluar:recomendador` (necesita la base con precios; **reescribe `docs/evaluacion-recomendador.md`** con los números del momento).

## 9. Riesgos de sesgo, privacidad y transparencia

### Sesgo

| Riesgo | Detalle | Mitigación actual |
|---|---|---|
| Favorece lo más barato | Optimizar costo lleva a menús con legumbres, papas, huevos y arroz y a repetir platos | `pesoCosto` ajustable, exclusiones, rechazos y adaptación desactivable. La evaluación lo reconoce: la variedad no se mide |
| Sesgo del catálogo | Solo 25 recetas (15 almuerzos, 6 cenas, 4 desayunos) y 31 ingredientes, de cocina chilena casera: no representa dietas vegetarianas, regionales ni otras culturas | Documentado; ampliar el catálogo es trabajo futuro |
| Sin restricciones alimentarias | No considera alergias, intolerancias, dietas ni nutrición. Una sugerencia barata puede ser inadecuada para una persona | Exclusión manual de ingredientes (no persistente). **Es una limitación seria; no es una herramienta de nutrición** |
| Cobertura de precios | Solo 2 supermercados (mismo grupo) y precios de un momento; "más barata" significa entre esas tiendas | Se muestra la fecha de cada precio y las recetas sin precios suficientes van al final |
| Error de valorización | La estimación depende de la normalización y de una heurística de relevancia: puede elegir un producto poco representativo ([normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md), sección 7.2) | La explicación avisa cuando falta precio y que el costo es un mínimo |
| Ranking relativo | El costo se normaliza respecto de las recetas que quedan tras los filtros: el mismo plato obtiene otro puntaje si cambian los filtros | Es un comportamiento esperado; el costo por porción en pesos siempre se muestra |
| Lo ya planificado vuelve a sugerirse | Una receta que ya está en el plan sigue en la lista | Limitación conocida, no corregida |

### Privacidad

- El recomendador **solo guarda** qué receta aceptó o rechazó cada usuario (`recomendacion_feedback`: id de usuario, id de receta, acción, fecha). No guarda pesos ni exclusiones (llegan en la consulta).
- Esos datos se borran en cascada al eliminar la cuenta (`ON DELETE CASCADE`).
- Los precios son públicos y no se asocian a ningún usuario. No se envían datos del usuario a terceros ni a las tiendas.
- Las comidas del plan pueden revelar hábitos de alimentación y se tratan como datos personales (ver `docs/seguridad-privacidad-etica.md`, en la rama `feature/seguridad`).
- No hay modelo del usuario ni perfilado: no se infieren características personales.

### Transparencia

- Cada sugerencia se explica en lenguaje natural y se entregan los datos del cálculo.
- La adaptación se puede apagar y el resultado sin adaptación se puede ver (orden alfabético).
- Limitación: la explicación dice **qué** pesó (costo y reutilización), pero el usuario no ve la fórmula completa dentro de la aplicación; está en este documento.

## 10. Limitaciones y trabajo futuro

- Catálogo fijo de 25 recetas, con cantidades aproximadas. No hay recetas del usuario ni importación.
- Sin restricciones dietarias, nutrición, tiempo de preparación ni dificultad.
- Las aceptaciones no alimentan el ranking; no hay aprendizaje.
- Variedad no medida ni garantizada.
- Las exclusiones y el peso del costo no se guardan entre sesiones.
- La evaluación es una simulación; falta la prueba con personas.
- Trabajo futuro posible: recordar preferencias, penalizar repeticiones, medir variedad, ampliar el catálogo y evaluar un ajuste de pesos con datos reales de uso.
