# Correcciones de la Entrega Parcial 1

Este documento relaciona cada observación recibida en la EP1 con lo que se hizo, la evidencia y el estado real. La EP1 quedó etiquetada como `v1.0.0-ep1`.

**Cómo leer el estado:** *Hecho* significa que el cambio existe en el código o la documentación y se verificó como se indica; *Parcial* indica qué falta. Nada se declara resuelto sin evidencia.

Todo el trabajo está unido en `integration/ep2-ef` (verificada en local; el CI en GitHub lo verá Jan). Las ramas de origen de cada cambio se nombran como referencia: `feature/core-domain` (dominio, recomendador, API), `feature/ci-auditoria` (auditoría y migraciones), `feature/pipeline-staging` (CI/CD y staging), `feature/docs-ep2` (documentación).

## Resumen

| # | Observación de la EP1 | Qué se hizo | Estado |
|---|---|---|---|
| 1 | Fortalecer la justificación arquitectónica, relacionar objetivos con indicadores de utilidad y definir cómo se comprobará que las recomendaciones reducen costos y desperdicios | ADR-004 y ADR-005, documento de objetivos e indicadores con protocolo de prueba, simulación del recomendador contra versiones base | **Hecho** en documentación y simulación; **Parcial** en la comprobación con usuarios reales (pendiente de ejecutar) |
| 2 | `synchronize: true` en desarrollo: la estructura final debe ser reproducible exclusivamente mediante migraciones | Job `migraciones` en el CI (base vacía, todas las migraciones, comprobación de deriva) y documento de política | **Hecho**; `synchronize` se mantiene en desarrollo por decisión documentada |
| 3 | Documentar la API mediante Swagger | Swagger UI en `/api/docs` con el plugin de Nest, especificaciones exportadas en `docs/api/` | **Hecho**, con brechas menores (respuestas como `object`) |
| 4 | Documentar las reglas o algoritmos para normalizar ingredientes | `docs/normalizacion-de-ingredientes.md` con reglas, ejemplos ejecutados y limitaciones | **Hecho** |
| 5 | Explicar cómo el procesamiento se usará para generar listas de compras y comparar precios | Sección 7 del documento de normalización, y la funcionalidad ya implementada en el backend | **Hecho** (documentación y código) |
| 6 | Cambiar `--audit-level=critical` (las altas no provocan fallo) | `--audit-level=high` en backend y frontend y corrección de las vulnerabilidades altas que aparecieron | **Hecho** |

## Detalle por observación

### 1. Justificación arquitectónica, objetivos e indicadores, comprobación de reducción de costos y desperdicio

| Aspecto | Evidencia |
|---|---|
| Justificación de las decisiones principales, con criterios, alternativas descartadas y riesgos | [ADR-004: arquitectura y justificación](adr/004-arquitectura-y-justificacion.md) |
| Decisión de reglas y puntaje frente a aprendizaje automático | [ADR-005: recomendador adaptativo](adr/005-recomendador-adaptativo.md) |
| Objetivos vinculados a indicadores con fórmula, fuente y meta | [objetivos-e-indicadores.md](objetivos-e-indicadores.md), sección 2 |
| Cómo se comprobará la reducción de costo y desperdicio (3 niveles) | [objetivos-e-indicadores.md](objetivos-e-indicadores.md), sección 4 |
| Simulación con precios reales y versiones base | [evaluacion-recomendador.md](evaluacion-recomendador.md); se repite con `npm run evaluar:recomendador` en `backend/` |
| Especificación completa de la capacidad adaptativa | [capacidad-adaptativa.md](capacidad-adaptativa.md) |
| Pruebas | `backend/src/recommendations/scoring.spec.ts` y `backend/test/recommendations.e2e-spec.ts` |

Resultado medido: la canasta del menú adaptativo cuesta entre 25% y 56% menos que la aleatoria y entre 27% y 59% menos que la alfabética; con recetas ya en el plan, la reutilización compra 2 ingredientes distintos menos a cambio de una canasta 10% más cara que optimizando solo costo.

**Qué falta:** es una simulación. La tasa de aceptación, la utilidad percibida, el tiempo ahorrado y la comprensión de las explicaciones requieren la prueba con 5 a 10 personas (protocolo y cuestionario definidos en la sección 4 de [objetivos-e-indicadores.md](objetivos-e-indicadores.md)). Ejecutarla le corresponde al equipo.

### 2. Migraciones como única fuente de verdad

| Aspecto | Evidencia |
|---|---|
| Job `migraciones` del CI: base vacía, `migration:run`, `migration:show` y `migration:check` (falla si hay entidades sin migración); `docker-images` y `deploy-staging` dependen de él | `.github/workflows/ci.yml` (job `migraciones`), commit `c71af0f` de `feature/ci-auditoria` |
| Scripts `migration:check` y `migration:show` | `backend/package.json` |
| Política, procedimiento para crear migraciones y limitaciones | `docs/migraciones-y-auditoria.md`, sección 2 |
| Producción sin `synchronize` y con `migrationsRun` | `backend/src/app.module.ts` (en esta rama) |
| La CLI de migraciones usa `synchronize: false` fijo | `backend/src/data-source.ts` (en esta rama) |
| Decisión y consecuencias | [ADR-004](adr/004-arquitectura-y-justificacion.md), decisión 5 |

**Verificado en local (22-11-2026)** sobre `integration/ep2-ef`: en una base vacía se ejecutaron las 5 migraciones (`InitialSchema`, `DominioComidasProductosListas`, `PreciosScraping`, `PlanSemanalYListas`, `RecomendacionFeedback`) sin error y `migration:generate --check` respondió "No changes in database schema were found" (sin deriva entre entidades y migraciones). La base temporal se eliminó.

**Qué falta o conviene saber:**

- El job `migraciones` está en `.github/workflows/ci.yml` de `integration/ep2-ef` y es requisito de `docker-images` y `deploy-staging`.
- No se vio correr el job en GitHub Actions (solo se reprodujeron sus pasos en local).
- Se mantiene `synchronize` en desarrollo a propósito; la garantía es que producción no lo usa y que el CI falla si una entidad cambia sin su migración. No se verifica el método `down` de cada migración.
- Una base de desarrollo creada con `synchronize` no sirve para probar migraciones (hay que usar una base vacía).

### 3. API documentada con Swagger

| Aspecto | Evidencia |
|---|---|
| Swagger UI en `/api/docs`, con autenticación Bearer y el plugin de `@nestjs/swagger` | `backend/src/main.ts`, `backend/nest-cli.json` (commit `0566520`) |
| Controladores con `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth` y respuestas 400, 401, 409 y 429 | `auth`, `ingredients`, `prices`, `meals`, `shopping-lists`, `recommendations`, `users`, métricas y salud |
| Especificación exportada de la aplicación corriendo (26 operaciones, todas con resumen) | [`docs/api/openapi.json`](api/openapi.json) |
| Especificación del servicio Python (3 operaciones) | [`docs/api/openapi-python.json`](api/openapi-python.json) |
| Cómo regenerar y brechas conocidas | [`docs/api/README.md`](api/README.md) |

**Verificado:** con el backend de `integration/ep2-ef` corriendo, `/api/docs-json` entregó la especificación con 26 operaciones y ninguna sin resumen; FastAPI publica la suya en `/openapi.json`.

**Qué falta:** la mayoría de las respuestas aparecen como `object` sin campos (no se declararon DTO de respuesta).

### 4. Reglas y algoritmos de normalización de ingredientes

| Aspecto | Evidencia |
|---|---|
| Reglas (limpieza, mapeo exacto, singular y por contención, sinónimos, unidades, densidad y peso por unidad, unión de líneas), con entradas y salidas reales | [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md) |
| Código | `python-service/app/normalizacion.py` y `normalizacion_datos.py` |
| Pruebas | `python-service/tests/test_normalizacion.py` y `test_ingredients.py` (suite completa: 149 pruebas del servicio Python en verde el 22-11-2026) |

**Qué falta:** el mapeo es léxico. Se corrigieron los casos que se detectaron (`leche condensada`, `leche de coco`, `harina de maíz`, `aceite de coco`, `pasta de tomate`), pero otros nombres compuestos pueden mapearse al término más cercano (`aceite de oliva` se toma como aceite); están documentados como limitaciones.

### 5. De la normalización a la lista de compras y la comparación de precios

| Aspecto | Evidencia |
|---|---|
| Explicación del flujo y ejemplo con precios reales | [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md), secciones 2 y 7 |
| Generación de la lista a partir del plan | `backend/src/shopping-lists/shopping-lists.service.ts` (`POST /api/shopping-lists/generate`) |
| Costo estimado por tienda | `backend/src/shopping-lists/costo.ts` y `relevancia.ts` |
| Comparación de precios | `backend/src/prices/compare.ts` (`GET /api/prices/compare`) |
| Pruebas | `costo.spec.ts`, `relevancia.spec.ts`, `compare.spec.ts`, `backend/test/domain.e2e-spec.ts` |
| Frontend | Páginas de plan semanal, lista de compras y comparador consumen estos endpoints (`frontend/src/app/tabs/`) |

**Verificado:** con el backend y el servicio Python reales, un plan con ingredientes escritos de forma distinta se convirtió en una lista consolidada con costo por tienda (ejemplo en la sección 7.2 del documento). **Qué falta:** la estimación puede elegir productos poco representativos (documentado).

### 6. Severidad de la auditoría de dependencias

| Aspecto | Evidencia |
|---|---|
| `npm audit --omit=dev --audit-level=high` en backend y frontend | Rama `feature/ci-auditoria`: `.github/workflows/ci.yml`, commit `282aad3` |
| Corrección de las vulnerabilidades altas que el cambio dejó al descubierto | Backend: commit `4a8628c` (solo `package-lock.json`). Frontend: commit `282aad3` (todos los paquetes `@angular/*` a 22.3.0) |
| `pip-audit` sin niveles de severidad: falla ante cualquier vulnerabilidad | `ci.yml`, documentado en `docs/migraciones-y-auditoria.md`, sección 1 |

**Verificado en local (22-11-2026)** con `npm audit --omit=dev --audit-level=high --package-lock-only`:

| Código | Backend | Frontend |
|---|---|---|
| `feature/core-domain` (antes de unir la auditoría, con umbral `critical`) | 4 altas y 1 moderada (`body-parser`, `follow-redirects`...) | 2 altas |
| `feature/ci-auditoria` | 0 vulnerabilidades | 0 vulnerabilidades |
| `integration/ep2-ef` | 0 vulnerabilidades | 0 vulnerabilidades |

Es decir: con el umbral anterior (`critical`) el pipeline pasaba aunque había 6 vulnerabilidades altas en producción; con `high` habría fallado hasta aplicar las correcciones, que están en la rama indicada.

**Qué falta:** no se ejecutó `pip-audit` en GitHub ni se vio correr el CI allí; la verificación fue local.

## Otros problemas del pipeline y del estado del proyecto

| Tema (sección 24.2, entregable 1) | Estado | Evidencia |
|---|---|---|
| Despliegue automático a staging, health checks, integración NestJS-FastAPI, validación de Terraform, rollback | **Hecho**; el ambiente real no existe todavía | `.github/workflows/`, `docs/pipeline-y-staging.md` |
| Proxy del frontend configurable (`BACKEND_URL`) en lugar de `http://backend:3000` fijo | **Hecho** | `frontend/nginx.conf.template` |
| README desactualizado (decía que Swagger y el scraping no existían) | Hecho | [README.md](../README.md) reescrito |
| Arquitectura y modelo de datos actualizados | Hecho | [ADR-004](adr/004-arquitectura-y-justificacion.md); `docs/architecture.md` (el scraper y la regla de que Python no escribe en la base) y `docs/database.md` (tablas reales de las 5 migraciones) |
| Backlog y estado del proyecto | **Pendiente de Jan:** el enlace al tablero no está en el repositorio | [checklist-entrega.md](checklist-entrega.md) |
