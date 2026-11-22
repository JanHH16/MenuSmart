# Evaluación del recomendador

> Generado con `npm run evaluar:recomendador` el 2026-11-22. Los números salen de los precios reales guardados en la base de datos; al volver a ejecutarlo con precios más nuevos cambian.

## Qué se evalúa

El recomendador sugiere recetas ordenadas por costo por porción y por reutilización de los ingredientes que ya están en la semana. Esta evaluación responde una pregunta concreta: **¿un menú armado con sus sugerencias cuesta menos y desperdicia menos que uno armado sin adaptación?**

- **Simulación:** el usuario acepta 5 sugerencias de almuerzo o cena, de a una, y el recomendador recalcula después de cada una (así funciona la app).
- **Versiones base (no adaptativas):** orden alfabético, y elección aleatoria con semilla fija (20261122) promediada en 1000 repeticiones.
- **Recetas candidatas:** 21 (almuerzos y cenas del catálogo; 21 con al menos 70% de sus ingredientes con precio).
- **Precios:** 1946 precios vigentes de 1590 productos reales de Jumbo y Santa Isabel. Última actualización: jumbo: 2026-11-21 20:28 UTC, santa_isabel: 2026-11-21 20:28 UTC.

## Indicadores

| Indicador | Definición | Qué significa que baje |
|---|---|---|
| Costo por porción | Costo promedio por porción de las recetas del menú, con la tienda más barata para cada ingrediente | Comer cuesta menos |
| Costo de la canasta | Costo de comprar todos los ingredientes del menú (cantidades repetidas se suman) | Se gasta menos en el supermercado |
| Ingredientes distintos | Cantidad de productos diferentes que hay que comprar | Lista más corta |
| Ingredientes de un solo uso | Porcentaje de ingredientes que aparecen en una sola receta del menú | **Indicador indirecto de desperdicio:** lo que se compra para una sola receta es lo que más probablemente sobra |

## Resultados

### Semana vacía

| Estrategia | Costo por porción | Costo de la canasta | Ingredientes distintos | Ingredientes de un solo uso |
|---|---|---|---|---|
| Base alfabética | $1.251 | $24.250 | 13 | 31% |
| Base aleatoria (promedio de 1000) | $1.150 | $22.491 | 14.4 | 56% |
| Adaptativa (costo 100%, reutilización 0%) | $494 | $9.880 | 5 | 0% |
| Adaptativa (costo 60%, reutilización 40%) | $494 | $9.880 | 5 | 0% |
| Adaptativa (costo 30%, reutilización 70%) | $494 | $9.880 | 5 | 0% |

### Plan con 2 recetas (arroz con pollo, ensalada chilena)

| Estrategia | Costo por porción | Costo de la canasta | Ingredientes distintos | Ingredientes de un solo uso |
|---|---|---|---|---|
| Base alfabética | $1.150 | $31.436 | 16 | 38% |
| Base aleatoria (promedio de 1000) | $1.092 | $30.057 | 16.4 | 46% |
| Adaptativa (costo 100%, reutilización 0%) | $599 | $16.772 | 9 | 44% |
| Adaptativa (costo 60%, reutilización 40%) | $599 | $16.772 | 9 | 44% |
| Adaptativa (costo 30%, reutilización 70%) | $599 | $16.772 | 9 | 44% |

### Plan con 3 recetas (pollo al horno, charquicán, tortilla de papas)

| Estrategia | Costo por porción | Costo de la canasta | Ingredientes distintos | Ingredientes de un solo uso |
|---|---|---|---|---|
| Base alfabética | $1.218 | $38.222 | 15 | 33% |
| Base aleatoria (promedio de 1000) | $1.191 | $37.494 | 16.5 | 41% |
| Adaptativa (costo 100%, reutilización 0%) | $797 | $25.509 | 11 | 36% |
| Adaptativa (costo 60%, reutilización 40%) | $1.002 | $27.939 | 9 | 33% |
| Adaptativa (costo 30%, reutilización 70%) | $1.002 | $27.939 | 9 | 33% |


## Lectura de los resultados

- **Frente a elegir sin adaptación**, la canasta del menú adaptativo (60/40) cuesta entre 25% y 56% menos que la aleatoria y entre 27% y 59% menos que la alfabética. Esta diferencia es esperable: el sistema optimiza justamente el costo, así que ganar en costo no es el resultado más informativo.
- **Lo informativo es el efecto de la reutilización**, que es lo que distingue al recomendador de simplemente "ordenar por precio". Comparando solo costo (100/0) con costo y reutilización (60/40):
- **Semana vacía:** darle importancia a la reutilización no cambia el menú, porque las recetas más baratas ya comparten ingredientes.
- **Plan con 2 recetas (arroz con pollo, ensalada chilena):** darle importancia a la reutilización no cambia el menú, porque las recetas más baratas ya comparten ingredientes.
- **Plan con 3 recetas (pollo al horno, charquicán, tortilla de papas):** con reutilización (60/40) el menú compra 2 ingredientes distintos menos y los de un solo uso pasan de 36% a 33%, a cambio de una canasta 10% más cara que optimizando solo el costo.
- **Qué se pierde:** los menús adaptativos repiten ingredientes y platos baratos (legumbres, papas, huevos, arroz), así que bajan la variedad. La variedad no se mide aquí; por eso el usuario puede reducir el peso del costo, excluir ingredientes, rechazar recetas o desactivar la adaptación.

## Limitaciones (importante)

- **Es una simulación, no una medición con personas.** Demuestra que la adaptación hace lo que promete sobre los datos; no demuestra que a los usuarios les guste o que sigan las sugerencias. La tasa de aceptación, la utilidad percibida y la comprensión de las explicaciones deben medirse con usuarios reales (ver `docs/objetivos-e-indicadores.md`).
- **El desperdicio es un proxy.** No se conocen los tamaños de envase ni lo que el usuario ya tiene en casa; "ingrediente de un solo uso" es solo un indicador indirecto.
- **Las cantidades de las recetas son aproximadas** y el catálogo tiene 25 recetas y 31 ingredientes, lo que limita la variedad.
- **Los precios cambian a diario** y el costo mezcla productos de distinta marca; la estimación usa el más barato de la misma unidad que nombra al ingrediente (filtro por nombre, ver `docs/normalizacion-de-ingredientes.md`).
- **Sesgo:** al optimizar costo, el sistema favorece platos con ingredientes baratos (legumbres, papas) y puede rotar poco el menú. Por eso el usuario puede bajar el peso del costo, excluir ingredientes, rechazar recetas o desactivar la adaptación.
