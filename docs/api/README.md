# Documentación de la API

MenuSmart tiene dos APIs, cada una con su especificación OpenAPI generada desde el código:

| API | Especificación versionada | Documentación interactiva | Quién la llama |
|---|---|---|---|
| **NestJS** (API principal) | [`openapi.json`](openapi.json) | `http://localhost:3000/api/docs` (Swagger UI) y `http://localhost:3000/api/docs-json` | El frontend |
| **FastAPI** (servicio Python) | [`openapi-python.json`](openapi-python.json) | `http://localhost:8000/docs` (Swagger UI), `/redoc` y `http://localhost:8000/openapi.json` | Solo NestJS (servicio interno) |

Los dos archivos de este directorio se **exportaron de las aplicaciones corriendo** el 22-11-2026 (NestJS desde el estado de la rama `feature/core-domain`; FastAPI desde el servicio de esta rama). No se escriben a mano.

> **Alcance del archivo de NestJS.** Refleja la rama `feature/core-domain`. No incluye `GET /api/metrics` (rama `feature/observability`) ni `GET` y `DELETE /api/users/me` (rama `feature/seguridad`), que se suman al unir las ramas. Después de unirlas hay que regenerar el archivo (ver más abajo). La interfaz Swagger de la aplicación unida sí los muestra.

## Autenticación

Las rutas de NestJS, salvo `/health`, `/api` (mensaje de bienvenida), `POST /api/auth/register` y `POST /api/auth/login`, exigen `Authorization: Bearer <accessToken>`. El token se obtiene en el registro o en el inicio de sesión. En Swagger UI: botón **Authorize**, pegar solo el token. El servicio Python no tiene autenticación propia: no se expone a internet (en Render es un servicio privado).

## Endpoints de NestJS (de `openapi.json`)

| Método y ruta | Tag | Descripción |
|---|---|---|
| `GET /health` | Health | Estado del backend, de PostgreSQL y del servicio Python (fuera del prefijo `/api`) |
| `GET /api` | App | Mensaje de bienvenida |
| `POST /api/auth/register` | Auth | Registro; devuelve `accessToken` |
| `POST /api/auth/login` | Auth | Inicio de sesión; devuelve `accessToken` |
| `POST /api/ingredients/normalize` | Ingredients | Normaliza y suma ingredientes (llama al servicio Python) |
| `GET /api/meals` | meals | Comidas del plan semanal del usuario |
| `POST /api/meals` | meals | Agrega una comida con sus ingredientes |
| `GET /api/meals/{id}` | meals | Detalle de una comida |
| `PATCH /api/meals/{id}` | meals | Modifica una comida (si llegan ingredientes, reemplazan a los actuales) |
| `DELETE /api/meals/{id}` | meals | Elimina una comida y sus ingredientes |
| `POST /api/shopping-lists/generate` | shopping-lists | Genera la lista de compras de la semana desde el plan |
| `GET /api/shopping-lists` | shopping-lists | Lista de la semana con costo estimado por tienda |
| `PATCH /api/shopping-lists/items/{id}` | shopping-lists | Marca o desmarca un ítem como comprado |
| `GET /api/prices/catalog` | prices | Términos que se buscan en cada tienda |
| `POST /api/prices/refresh` | prices | Inicia la actualización de precios en segundo plano (202; 409 si ya hay una en curso; 429 si hubo una exitosa hace poco) |
| `GET /api/prices/runs` | prices | Últimas ejecuciones de actualización |
| `GET /api/prices/runs/{id}` | prices | Estado y métricas de una ejecución |
| `GET /api/prices/compare` | prices | Compara Jumbo y Santa Isabel por término y por producto idéntico |
| `GET /api/prices/quality` | prices | Métricas de calidad de los datos ([calidad-de-datos.md](../calidad-de-datos.md)) |
| `GET /api/recommendations` | recommendations | Recetas sugeridas con explicación ([capacidad-adaptativa.md](../capacidad-adaptativa.md)) |
| `POST /api/recommendations/accept` | recommendations | Acepta una sugerencia (la agrega al plan) |
| `POST /api/recommendations/reject` | recommendations | Rechaza una sugerencia |
| `DELETE /api/recommendations/feedback` | recommendations | Vuelve a mostrar las rechazadas |

Total: 23 operaciones. Los parámetros y cuerpos de cada una están en el JSON y en Swagger UI.

## Endpoints del servicio Python (de `openapi-python.json`)

| Método y ruta | Descripción |
|---|---|
| `GET /health` | Estado del servicio |
| `POST /ingredients/normalize` | Normalización de ingredientes ([normalizacion-de-ingredientes.md](../normalizacion-de-ingredientes.md)) |
| `POST /scrape/search` | Búsqueda de precios en una tienda (Jumbo o Santa Isabel), con validación y estadísticas ([ADR-003](../adr/003-metodo-scraping.md)) |

Con la rama `feature/observability` se suma `GET /metrics`.

## Cómo regenerar las especificaciones

**NestJS.** Levantar el backend con la base de datos y el servicio Python (como en el README de la raíz) y descargar el JSON:

```bash
# bash (con el backend en el puerto 3000)
curl -s http://localhost:3000/api/docs-json -o docs/api/openapi.json
```

```powershell
# PowerShell
Invoke-RestMethod http://localhost:3000/api/docs-json | ConvertTo-Json -Depth 100 | Set-Content docs/api/openapi.json -Encoding utf8
```

El archivo versionado está formateado con 2 espacios de sangría (`python -m json.tool --indent 2` o `jq .`) para que las diferencias en git sean legibles; el volcado crudo viene en una línea. En PowerShell 5.1 conviene formatear con `python -m json.tool` para mantener los acentos y evitar el BOM.

**FastAPI.**

```bash
# con el servicio en el puerto 8000
curl -s http://localhost:8000/openapi.json -o docs/api/openapi-python.json
```

```powershell
Invoke-RestMethod http://localhost:8000/openapi.json | ConvertTo-Json -Depth 100 | Set-Content docs/api/openapi-python.json -Encoding utf8
```

**Cuándo regenerar:** al agregar, quitar o cambiar un endpoint o un DTO, y después de unir ramas que agreguen controladores.

## Estado de la documentación (verificado en `openapi.json`)

Todos los controladores de dominio aparecen: `auth`, `ingredients`, `prices`, `meals`, `shopping-lists`, `recommendations` (y `health` y la raíz `/api`). Falta `metrics`, que está en otra rama (arriba).

Brechas conocidas, que no se corrigieron aquí porque implican cambiar código fuente:

| Brecha | Detalle |
|---|---|
| Sin descripción | `GET /api`, `GET /health`, `POST /api/auth/register`, `POST /api/auth/login` y `POST /api/ingredients/normalize` no tienen `summary` ni `description` |
| Sin etiqueta propia ni seguridad | `auth` e `ingredients` no usan `@ApiTags`/`@ApiOperation`; `POST /api/ingredients/normalize` exige token pero Swagger no lo marca (falta `@ApiBearerAuth`) |
| Sin descripción larga | Las operaciones de `meals` salvo dos, `GET /api/prices/catalog`, `/runs`, `/runs/{id}`, y los endpoints de aceptar, rechazar y restablecer recomendaciones tienen solo `summary` |
| Respuestas sin forma | Las respuestas de `shopping-lists`, `prices/compare`, `prices/quality` y `recommendations` aparecen como `type: object` sin sus campos, porque devuelven interfaces de TypeScript y no clases con `@ApiProperty` |
| Errores no documentados | Ninguna operación declara las respuestas 400, 401, 404, 409 o 429 que sí produce (por ejemplo 409 y 429 en `POST /api/prices/refresh` solo figuran en la descripción) |
| Python | Los `summary` son los autogenerados por FastAPI ("Health", "Normalize Ingredients", "Search Prices"); `GET /health` no tiene descripción |

Los esquemas de entrada (cuerpos y parámetros con validación) sí están completos, porque salen de los DTO con `class-validator`.
