# Calidad de los datos recuperados de la web

Este documento define las métricas de calidad de los precios obtenidos de Jumbo y Santa Isabel, explica cómo se calculan, y entrega los **valores reales** medidos el 22-11-2026 sobre los datos que ya estaban guardados (no se ejecutó un nuevo scraping contra las tiendas para escribirlo).

## 1. Qué pide el enunciado y dónde se responde

La sección 22 del enunciado exige responder diez preguntas sobre la información web. Resumen con referencia:

| Pregunta | Respuesta | Dónde |
|---|---|---|
| ¿Qué información necesita la aplicación? | Precio, nombre, marca, cantidad, disponibilidad y URL de productos de supermercado, para 31 ingredientes del catálogo | [`backend/src/prices/catalogo.ts`](../backend/src/prices/catalogo.ts) |
| ¿De qué fuente? | Jumbo y Santa Isabel (grupo Cencosud) | [ADR-002](adr/002-fuentes-datos-web.md) |
| ¿Mediante qué método? | Web scraping del bloque JSON-LD (schema.org) de la página de búsqueda; no hay API pública de precios | [ADR-003](adr/003-metodo-scraping.md) |
| ¿Con qué frecuencia se actualizan? | **Bajo demanda:** `POST /api/prices/refresh` (botón de actualizar en el comparador). No hay un programador automático (cron) hoy. Mínimo 10 minutos entre dos actualizaciones exitosas y una sola en curso a la vez | [`prices.service.ts`](../backend/src/prices/prices.service.ts) |
| ¿Cómo se limpian y normalizan? | El servicio Python normaliza el nombre y deriva cantidad y precio unitario desde el nombre ("400 g" pasa a 0,4 kg); el backend normaliza los ingredientes del usuario contra el mismo catálogo | [`scrapers/normalizer.py`](../python-service/app/scrapers/normalizer.py), [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md) |
| ¿Cómo se detectan duplicados? | Por `slug` de la URL del producto (mismo identificador en ambas tiendas): dentro de una respuesta, entre lotes y a nivel de base con índices únicos | Sección 3 |
| ¿Cómo se registra la procedencia? | Cada precio guarda tienda, fecha y hora de obtención, ejecución que lo trajo, URL del producto y consulta del catálogo con la que se encontró | Sección 4 |
| ¿Cómo se validan? | Pydantic en Python, validador propio en NestJS y restricciones en la base | [ADR-004](adr/004-arquitectura-y-justificacion.md), decisión 3 |
| ¿Qué pasa si la fuente no está disponible? | La consulta falla con un tipo de error (`timeout`, `red`, `bloqueo`, `http`, `robots`, `estructura`), la corrida queda `parcial` o `fallido` y **los precios anteriores siguen disponibles con su fecha** | Sección 7 |
| ¿Qué restricciones legales, éticas y de privacidad? | `robots.txt` interpretado y respetado, 1 solicitud por segundo, User-Agent identificable, solo páginas públicas de búsqueda, sin datos de usuarios. Los términos de servicio no se analizaron jurídicamente | [ADR-003](adr/003-metodo-scraping.md), `docs/seguridad-privacidad-etica.md` (rama `feature/seguridad`) |

## 2. Las métricas y cómo se calculan

Las calcula `calcularCalidad` en [`backend/src/prices/calidad.ts`](../backend/src/prices/calidad.ts) y las expone `GET /api/prices/quality` (requiere token). Los datos de entrada son las filas de `ejecuciones_scraping` (una por tienda y por actualización) y la tabla de precios.

**Ventana:** por tienda, las últimas 10 ejecuciones terminadas (estado distinto de `en_curso`), tomadas de las 60 corridas más recientes. Hoy hay 1 por tienda.

| Métrica | Campo de la API | Definición | Cálculo |
|---|---|---|---|
| Registros extraídos | `registros.extraidos` | Productos que la tienda devolvió para las consultas, antes de validar | Suma de `registrosExtraidos` de la ventana |
| Registros válidos | `registros.validos`, `porcentajeValidos` | Productos que pasaron la validación y quedaron guardados | `validos / extraidos x 100` (1 decimal) |
| Duplicados | `registros.duplicados`, `porcentajeDuplicados` | Productos repetidos (mismo `slug`) que se descartaron. Incluye los que se repiten entre consultas de lotes distintos | `duplicados / extraidos x 100` |
| Descartados | `registros.descartados`, `porcentajeDescartados` | Productos inválidos: sin precio, precio no numérico o no positivo, moneda distinta de CLP, URL fuera del dominio, sin nombre u otros datos inválidos; más los que NestJS rechaza por no cumplir el contrato | `descartados / extraidos x 100` |
| Tasa de errores de consultas | `tasaErroresConsultas` | Porcentaje de consultas (una por término del catálogo) que fallaron | `consultasFallidas / consultasTotal x 100` |
| Duración promedio | `duracionPromedioMs` | Duración promedio de **una ejecución completa** de la tienda (todas las consultas), no de una consulta | Promedio de `duracionMs` |
| Actualidad | `ultimaActualizacion`, `horasDesdeActualizacion` | Cuándo terminó la última ejecución `ok` o `parcial` y cuántas horas pasaron | `(ahora - finalizadaEn) / 3.600.000`, 1 decimal |
| Cobertura por tienda | `cobertura` | Cuántos de los 31 términos del catálogo tienen al menos un precio reciente | `terminosConPrecio / 31 x 100`; "reciente" = obtenido dentro de `PRICES_STALE_HOURS` (48 h) |
| Cobertura en ambas tiendas | `coberturaAmbasTiendas` | Términos con precio reciente en Jumbo **y** en Santa Isabel (los que se pueden comparar) | Intersección de ambos conjuntos, sobre 31 |

Los porcentajes redondean a un decimal y devuelven 0 si el denominador es 0. Las ejecuciones guardan además `descartesPorMotivo` (qué motivo de descarte) y `errores` (hasta 100, con consulta, tipo y detalle), visibles en `GET /api/prices/runs`.

Las reglas de validación que determinan "válido" están en [`scrapers/normalizer.py`](../python-service/app/scrapers/normalizer.py) y [`scrapers/schemas.py`](../python-service/app/scrapers/schemas.py): precio entero mayor que cero (máximo 100 millones) en CLP, nombre no vacío, URL `https` del dominio de la tienda con un `slug` válido, unidad `kg`, `l` o `un` si se pudo derivar.

## 3. Valores reales (22-11-2026)

Obtenidos con `GET /api/prices/quality` y `GET /api/prices/runs` sobre los datos guardados el 21-11-2026 (una actualización por tienda, estado `ok`). Se consultó a las 03:59 UTC del 22-11-2026.

### Por tienda

| Métrica | Jumbo | Santa Isabel |
|---|---|---|
| Ejecuciones consideradas | 1 (estado `ok`) | 1 (estado `ok`) |
| Registros extraídos | 1.080 | 909 |
| Registros válidos | 1.075 (**99,5%**) | 871 (**95,8%**) |
| Duplicados | 5 (0,5%) | 38 (4,2%) |
| Descartados | 0 (0%) | 0 (0%) |
| Consultas ejecutadas, ok, fallidas | 31, 31, 0 | 31, 31, 0 |
| Tasa de errores de consultas | **0%** | **0%** |
| Duración de la ejecución | 36.827 ms (36,8 s) | 42.826 ms (42,8 s) |
| Última actualización | 2026-11-21 20:28:27 UTC | 2026-11-21 20:28:33 UTC |
| Horas desde la actualización | **7,5 h** | **7,5 h** |
| Cobertura del catálogo | **31 de 31 (100%)** | **31 de 31 (100%)** |

### Cobertura en ambas tiendas

31 de 31 términos (**100%**) tienen precio reciente en las dos tiendas.

Comprobación aritmética: extraídos = válidos + duplicados + descartados en ambas tiendas (1.080 = 1.075 + 5 + 0; 909 = 871 + 38 + 0). Los 1.075 + 871 = 1.946 registros válidos coinciden con las 1.946 filas de `precios_supermercado`.

### Datos guardados (consulta directa a la base local)

Estas cifras no las entrega `/api/prices/quality`; salen de consultar las tablas para completar el panorama.

| Dato | Valor |
|---|---|
| Productos distintos | 1.590 |
| Precios guardados | 1.946 (Jumbo 1.075, Santa Isabel 871) |
| Productos con cantidad detectada en el nombre | 1.454 de 1.590 (91,4%); 136 sin cantidad |
| Precios con precio unitario | Jumbo 981 de 1.075 (91,3%); Santa Isabel 820 de 871 (94,1%) |
| Precios de productos disponibles | Jumbo 1.064 de 1.075 (99,0%); Santa Isabel 871 de 871 (100%) |
| Productos presentes en ambas tiendas (mismo `slug`) | 356 de 1.590 (22,4%) |
| Ventana de obtención | 2026-11-21 20:27:57 a 20:28:33 UTC |

### Comparabilidad (de `GET /api/prices/compare`)

De los 31 términos, 26 se pueden comparar por precio unitario (Santa Isabel más barata en 15, Jumbo en 8, empate en 3) y 5 no son comparables porque el precio unitario falta o las unidades difieren (por ejemplo kg contra unidad).

### Lectura

- **La calidad estructural es alta:** más de 95% de los registros son válidos, no hubo descartes ni errores de consulta, y todos los términos tienen precio en las dos tiendas.
- **Santa Isabel repite más (4,2%)** que Jumbo (0,5%): el mismo producto aparece en varias consultas (por ejemplo un producto que sirve para `salsa de tomate` y `tomate`). Es esperado y se resuelve guardando el producto una sola vez.
- **Los precios son frescos** (7,5 horas) respecto del umbral de 48 horas, pero la frescura depende de que alguien dispare la actualización: no es automática.
- **El tiempo es razonable pero no corto:** 37 a 43 segundos por tienda, determinado sobre todo por el límite de 1 solicitud por segundo que se respeta a propósito.

## 4. Procedencia y persistencia

| Dato | Dónde se guarda | Para qué sirve |
|---|---|---|
| Tienda, fecha y hora de obtención, ejecución | `precios_supermercado` (`supermercado`, `fechaObtencion`, `ejecucionId`) | Saber cuándo y en qué corrida se obtuvo cada precio |
| URL del producto | `precios_supermercado.urlProducto` | Verificar el dato en la fuente |
| Consulta del catálogo con que se encontró | `precios_supermercado.consulta` | Vincular el producto con el ingrediente |
| Identificador del producto (slug de la URL) | `productos.slug` (único) | Detectar duplicados y reconocer el mismo producto en ambas tiendas |
| Resultado de cada corrida: contadores, errores, descartes por motivo, duración | `ejecuciones_scraping` | Calcular estas métricas y diagnosticar fallas |

Control de duplicados en la base: `UQ_productos_slug` (un producto por slug) e `IDX_precios_tienda_producto_dia` (**un precio por producto, tienda y día**). La carga usa `INSERT ... ON CONFLICT`, por lo que repetir una actualización el mismo día no duplica filas (la última sobrescribe). Implicación: el historial es diario, no por corrida.

## 5. Cómo reproducir las mediciones

Sin volver a consultar a las tiendas: se usan los datos ya guardados.

**1. Base de datos, servicio Python y backend en marcha** (ver el README de la raíz). Con Docker Compose:

```bash
docker compose up -d database python-service backend
```

**2. Registrar un usuario de prueba y obtener un token.**

```bash
# bash
curl -s -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"prueba@example.test","password":"ClaveDePrueba1","name":"Prueba"}'
# la respuesta trae "accessToken"
TOKEN=<pegar el accessToken>
curl -s http://localhost:3000/api/prices/quality -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3000/api/prices/runs?limite=10" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3000/api/prices/compare?limiteComunes=100" -H "Authorization: Bearer $TOKEN"
```

```powershell
# PowerShell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/register -ContentType "application/json" `
  -Body '{"email":"prueba@example.test","password":"ClaveDePrueba1","name":"Prueba"}'
$h = @{ Authorization = "Bearer $($r.accessToken)" }
Invoke-RestMethod http://localhost:3000/api/prices/quality -Headers $h | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:3000/api/prices/runs?limite=10" -Headers $h | ConvertTo-Json -Depth 4
```

El puerto es 3000 con Docker Compose; en las mediciones de este documento el backend se levantó en otro puerto. Si la base está vacía (sin ninguna actualización), las métricas salen en 0 y `ultimaActualizacion` en `null`: hay que ejecutar antes `POST /api/prices/refresh` (esto sí consulta a las tiendas, de a una solicitud por segundo).

**3. Datos guardados** (la tabla "Datos guardados" de la sección 3):

```sql
SELECT count(*) AS productos FROM productos WHERE slug IS NOT NULL;
SELECT supermercado, count(*) AS filas, count("precioUnitario") AS con_unitario
FROM precios_supermercado GROUP BY supermercado;
```

## 6. Pruebas que respaldan el cálculo

- [`backend/src/prices/calidad.spec.ts`](../backend/src/prices/calidad.spec.ts): porcentajes, ventana de ejecuciones, actualidad y cobertura.
- [`backend/src/prices/prices.service.spec.ts`](../backend/src/prices/prices.service.spec.ts) y `backend/test/prices.e2e-spec.ts`: estados `ok`, `parcial` y `fallido`, deduplicación entre lotes, caída del servicio Python con datos anteriores disponibles.
- `python-service/tests/test_scraper_normalizer.py`, `test_scraper_parser.py`, `test_scraper_service.py`, `test_scraper_robots.py`: validación de cada registro, descartes por motivo, `robots.txt`, reintentos, redirecciones y tamaño máximo.

## 7. Qué ocurre ante indisponibilidad

| Situación | Resultado | Evidencia |
|---|---|---|
| La tienda no responde (timeout) | 1 intento más 2 reintentos con espera creciente; la consulta termina con error `timeout` | `test_scraper_service.py` |
| La tienda responde 429 o 403 (bloqueo) | No se insiste; error `bloqueo` | `test_scraper_service.py` |
| La tienda cambió su HTML (sin JSON-LD) | Error `estructura`; no se guardan datos de esa consulta | `test_scraper_parser.py`, `test_scraper_service.py` |
| `robots.txt` no se puede leer o no permite la ruta | No se scrapea; error `robots` | `test_scraper_robots.py`, `test_scraper_service.py` |
| Falla solo una consulta | Estado `parcial`: se conservan las demás | `test_scraper_service.py` |
| El servicio Python no responde | La corrida queda `fallido`, NestJS responde `503` y los precios anteriores siguen consultables | `backend/test/prices.e2e-spec.ts` |

## 8. Limitaciones

- **"Válido" no significa "correcto".** Un registro válido pasó controles de formato; no se verifica que sea el producto adecuado para el ingrediente. Por eso existe el filtro de relevancia en el costo de la lista ([normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md), sección 7.2), que es una heurística y puede fallar.
- **Una sola corrida por tienda** en la ventana: las métricas son una foto, no una tendencia. Con más ejecuciones, el promedio se calcula sobre hasta 10.
- **No hay detección de valores atípicos** de precio (un precio absurdo pero positivo y entero pasa).
- **Cobertura cuenta términos con algún precio**, aunque el único producto encontrado no sea representativo o no esté disponible.
- **El precio unitario se deriva del nombre.** El 8,6% de los productos no tiene cantidad en el nombre y no se puede comparar por precio unitario. Si el nombre dice otra cosa que el contenido real, el precio unitario es erróneo.
- **Precio vigente con oferta**, sin distinguir el precio normal; la disponibilidad puede variar por comuna y no se modela.
- **Solo los primeros 40 resultados** de cada consulta (una página).
- **El historial es diario** (un precio por producto, tienda y día).
- **Sin actualización automática ni alertas:** la frescura depende de que alguien dispare la actualización.
- **`duracionPromedioMs` es por ejecución,** no por consulta, aunque el nombre pueda sugerir lo contrario.
- **Términos de servicio** de las tiendas no analizados jurídicamente (uso académico, bajo volumen).
