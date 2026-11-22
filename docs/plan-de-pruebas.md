# Plan de pruebas y evaluación del sistema

Medido el 22-11-2026 sobre la rama de integración. Cada número de este documento sale de un comando que se puede repetir (columna "Cómo se repite").

## 1. Estrategia por niveles

| Nivel | Qué verifica | Herramienta | Cantidad | Dónde corre |
|---|---|---|---|---|
| Unitarias | Reglas puras: normalización de ingredientes, conversión de unidades, costos, puntaje del recomendador, semana, validación de DTO, logger, métricas | Jest (backend), pytest (Python), Vitest (frontend) | 189 backend + 140 Python + 77 frontend | Job de cada servicio en CI |
| Integración con la base | API completa contra PostgreSQL real: autenticación, plan semanal, lista de compras, precios, recomendador, cuenta de usuario, aislamiento entre usuarios | Jest + Supertest | 56 e2e | Job `backend` (servicio postgres) |
| Integración entre servicios | NestJS llamando al servicio Python real (HTTP real, sin internet, con fixtures de las tiendas) | Jest + uvicorn | 8 (`backend/test/python-real.integration-spec.ts`) | Job `integracion-python` |
| Contrato | La respuesta de Python se valida otra vez en NestJS (`parseScrapeResponse`) y los DTO rechazan entradas inválidas | Jest, Pydantic | incluidas arriba | Jobs `backend` y `python-service` |
| Recuperación | Fuente caída, bloqueo 429, HTML sin la estructura esperada, robots.txt no disponible, redirección a otro dominio, respuesta demasiado grande, Python caído | pytest (`test_scraper_service.py`), e2e de precios y de lista | 8 + 3 + 3 e2e | Jobs `python-service` e `integracion-python` |
| Seguridad | Cabeceras, límite de solicitudes (429), logs sin contraseñas ni tokens, `alg: none`, borrado de cuenta en cascada | e2e | ver `docs/seguridad-privacidad-etica.md` | Job `backend` |
| Estructura de la base | Todas las migraciones desde una base vacía y cero deriva con las entidades | `migration:run` + `migration:generate --check` | 5 migraciones | Job `migraciones` |
| Imágenes y dependencias | Vulnerabilidades altas o críticas en dependencias e imágenes Docker, secretos en el repo | npm audit, pip-audit, Trivy, gitleaks | n/a | Jobs `backend`, `frontend`, `python-service`, `docker-images`, `secrets-scan` |
| Infraestructura | Sintaxis y validez de Terraform y de los workflows | terraform validate, actionlint | n/a | Job `terraform`, revisión local |
| Evaluación de la adaptación | El recomendador contra versiones base con precios reales | `npm run evaluar:recomendador` | 3 escenarios x 5 estrategias | Manual (ver `docs/evaluacion-recomendador.md`) |
| No funcionales | Tiempos de respuesta, disponibilidad | `npm run medir:latencia`, `/health`, `/api/metrics` | ver sección 3 | Manual y en producción |

Total de pruebas automáticas: **462** (245 de backend entre unitarias y e2e, 140 de Python y 77 de frontend).

## 2. Cobertura

| Componente | Sentencias | Ramas | Funciones | Cómo se repite | Umbral en CI |
|---|---|---|---|---|---|
| Backend (unitarias y e2e juntas, en serie) | 97,7% | 81,4% | 97,3% | `cd backend; npm run test:cobertura` | 90% sentencias, 70% ramas (falla si baja) |
| Servicio Python | 96% | n/a | n/a | `cd python-service; pytest --cov=app` | 90% (falla si baja) |
| Frontend (Angular) | 48,3% | 58,4% | 52,0% | `cd frontend; npx ng test --watch=false --coverage` | Solo informe |

Lectura honesta:

- El backend y el servicio Python están bien cubiertos porque ahí vive la lógica del negocio.
- **El frontend está subcubierto (48%).** Las páginas con más lógica (servicios del plan, lista y comparador) sí tienen pruebas; las plantillas y la mayor parte de los estilos y componentes de presentación no. No hay pruebas de interfaz de punta a punta en un navegador (por ejemplo con Playwright): la navegación se verificó a mano en el navegador integrado y en Edge para la PWA.
- La cobertura del backend excluye `main.ts`, `data-source.ts` y las migraciones (las migraciones se verifican con el job `migraciones`).

## 3. Tiempos de respuesta

Medición local (Windows, PostgreSQL en Docker, 1.946 precios reales guardados, servicio Python local), 200 solicitudes por ruta con concurrencia 10:

| Ruta | p50 (ms) | p95 (ms) | Máximo (ms) | Errores |
|---|---|---|---|---|
| `GET /health` | 11,2 | 22,1 | 55,7 | 0 |
| `GET /api/meals` | 16,7 | 42,4 | 59,5 | 0 |
| `GET /api/shopping-lists` (con costo estimado) | 36,8 | 52,5 | 59,5 | 0 |
| `GET /api/prices/compare` | 155,6 | 248,8 | 285,7 | 0 |
| `GET /api/recommendations` | 357,2 | 486,9 | 613,2 | 0 |

Los mismos valores vistos desde el servidor (`GET /api/metrics`, medidos dentro del proceso, sin la red del cliente): `/api/prices/compare` p50 133,6 ms y p95 218,8 ms; `/api/recommendations` p50 285,8 ms y p95 408,8 ms.

Cómo se repite (el límite global se sube para medir la ruta y no el 429):

```powershell
cd backend
$env:RATE_LIMIT_GLOBAL_MAX = "100000"
npm run start
```

```powershell
cd backend
npm run medir:latencia -- http://localhost:3000 200
```

Limitaciones:

- Es una medición en una sola máquina y sin carga real: sirve para detectar regresiones y mostrar la métrica, no para dimensionar el servicio. No se hizo una prueba de carga.
- Las rutas más lentas (comparar y recomendar) leen todos los precios vigentes de la base en cada llamada. Si hiciera falta, el siguiente paso es guardar el resultado en memoria unos minutos o crear una vista materializada; hoy no es necesario para la escala del proyecto.
- En staging los tiempos serán distintos (base y servicios en Render, plan gratuito con arranque en frío). Hay que repetir la medición allí.

## 4. Disponibilidad y salud

- `GET /health` (NestJS) informa estado de la base y del servicio Python; `GET /health` de Python informa el suyo. El despliegue a staging los consulta con reintentos y falla si no responden (`docs/pipeline-y-staging.md`).
- Una caída de Python no tumba la API: la actualización de precios falla de forma controlada y los datos anteriores siguen disponibles (e2e "si el servicio Python no responde...").
- Disponibilidad medida en producción: **no hay datos todavía**, porque el staging aún no se despliega. Es un pendiente de la demo.

## 5. Calidad de los datos externos

Las métricas de la información web (porcentaje de registros válidos, duplicados, descartados, tasa de error, actualidad y cobertura) las entrega `GET /api/prices/quality` y se documentan con valores reales en `docs/calidad-de-datos.md`.

## 6. Evaluación de la capacidad adaptativa

Se compara el recomendador con una versión base (orden alfabético y selección aleatoria) en `docs/evaluacion-recomendador.md`. Es una simulación con precios reales; la utilidad percibida y la comprensión de las explicaciones requieren usuarios (protocolo en `docs/objetivos-e-indicadores.md`).

## 7. Qué no se prueba (limitaciones)

- Pruebas de interfaz de punta a punta en navegador y en la app Android (el APK se compila en CI; no se ha probado en un dispositivo).
- Prueba de carga y de resistencia.
- Accesibilidad automatizada completa (Lighthouse/axe): solo se revisó el shell de la app (etiquetas, foco, contraste base, `prefers-reduced-motion`).
- `migration:revert` y los `down` de las migraciones.
- El despliegue real en Render y la ejecución del pipeline en GitHub Actions: se validaron los pasos en local (ver `docs/pipeline-y-staging.md`), no el resultado en la nube.
