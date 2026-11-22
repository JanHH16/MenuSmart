# Checklist de entrega

Contraste honesto del repositorio con las rúbricas de la **EP2** (sección 29.3 del enunciado) y de la **Entrega Final** (sección 29.4). Para cada criterio: peso, evidencia en el repositorio, estado y qué falta.

**Estados:**

- **Hecho:** existe y se verificó (ver cómo en la columna de evidencia).
- **Parcial:** existe pero tiene una brecha que se nombra.
- **Pendiente de Jan:** requiere una acción manual fuera del repositorio.
- **No verificable aquí:** depende de GitHub, de Render o de un dispositivo y no se pudo comprobar desde el entorno de desarrollo.

**Qué se ejecutó para esta revisión (22-11-2026, en local):** pruebas unitarias del backend (140 en verde), del servicio Python (115 en verde) y del frontend (70 en verde); las 5 migraciones sobre una base vacía y `migration:generate --check` sin deriva; `npm audit` de backend y frontend en las ramas de código; el backend y el servicio Python corriendo contra la base con precios reales (calidad de datos, comparación, lista de compras, recomendaciones y exportación OpenAPI). **No se ejecutaron** las pruebas e2e (necesitan base de datos), el pipeline en GitHub, `terraform` ni el APK.

**Ramas:** parte de la evidencia vive en ramas que se unen en `integration/ep2-ef`: `feature/observability`, `feature/seguridad`, `feature/ci-auditoria`, `feature/pipeline-staging`, `feature/pwa-android`. Se nombra la rama cuando corresponde. Un enlace a un documento de otra rama no resuelve hasta unirlas.

## 1. Rúbrica de la EP2 (sección 29.3)

| # | Criterio | Peso | Evidencia en el repositorio | Estado | Qué falta |
|---|---|---|---|---|---|
| 1 | Continuidad y correcciones de la EP1 | 5% | [correcciones-ep1.md](correcciones-ep1.md) (6 observaciones con evidencia) | **Parcial** | Las correcciones 2 y 6 están en `feature/ci-auditoria`, sin unir. Falta el enlace al tablero y la actualización del backlog (Jan) |
| 2 | Fuente web, procedencia y uso responsable | 10% | [ADR-002](adr/002-fuentes-datos-web.md), [ADR-003](adr/003-metodo-scraping.md), [calidad-de-datos.md](calidad-de-datos.md) sección 1 y 4, `docs/seguridad-privacidad-etica.md` (`feature/seguridad`) | **Parcial** | `robots.txt`, frecuencia, procedencia y propósito están documentados y probados. Falta el análisis jurídico de los términos de servicio de las tiendas (no se hizo) |
| 3 | Recuperación, limpieza y calidad de datos | 15% | `python-service/app/scrapers/`, pruebas `test_scraper_*.py`, [calidad-de-datos.md](calidad-de-datos.md) (99,5% y 95,8% de registros válidos, 31 de 31 de cobertura) | **Hecho**, con brechas menores | La actualización es manual (no hay programación). No hay detección de precios atípicos |
| 4 | Procesamiento Python e integración con NestJS | 15% | [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md), [ADR-004](adr/004-arquitectura-y-justificacion.md) decisión 3, `python-client.service.ts` (timeouts, un reintento, 502 y 503), `scrape-response.ts`, pruebas de contrato | **Hecho** | La prueba de integración con el servicio Python real está en `feature/pipeline-staging` (no verificada aquí). La normalización es léxica (limitaciones documentadas) |
| 5 | Persistencia, indexación y consulta | 10% | `backend/src/migrations/`, [database.md](database.md), índices únicos de slug y de precio por día, `prices.sql.ts` | **Hecho** | El historial es un precio por producto, tienda y día |
| 6 | Evaluación de la información recuperada | 10% | [calidad-de-datos.md](calidad-de-datos.md) (definiciones, fórmulas, valores reales, limitaciones), `calidad.spec.ts` | **Hecho**, con brecha | Solo una ejecución por tienda (sin tendencia). No se midió la precisión del emparejamiento producto con ingrediente |
| 7 | Integración de extremo a extremo | 12% | Flujo tienda, Python, NestJS, PostgreSQL y frontend ejecutado en local con datos reales; comparador y lista consumen la API | **Parcial** | **Pendiente de Jan:** demostrarlo en staging, que no existe (sin `terraform apply`) |
| 8 | Diseño de la capacidad adaptativa | 8% | [capacidad-adaptativa.md](capacidad-adaptativa.md) (9 preguntas), [ADR-005](adr/005-recomendador-adaptativo.md), [objetivos-e-indicadores.md](objetivos-e-indicadores.md) | **Hecho** | La pantalla de sugerencias depende de otra rama |
| 9 | Pipeline, staging, seguridad y observabilidad | 10% | `ci.yml` y [pipeline-y-staging.md](pipeline-y-staging.md) (`feature/pipeline-staging`), `feature/ci-auditoria`, `feature/observability`, `feature/seguridad` | **Parcial** y **no verificable aquí** | Falta unir las ramas, ver el CI verde en GitHub y crear el staging. El CI de esta rama no incluye las pruebas de integración, Terraform ni el despliegue |
| 10 | Documentación, trazabilidad y demostración | 5% | [README](../README.md), [docs/api/](api/README.md), [guion-demo.md](guion-demo.md), [registro-participacion.md](registro-participacion.md) | **Parcial** | Celdas "confirmar" del registro de participación, enlaces a tablero y staging, ensayo de la demostración |

**Entregables del formato común (sección 24.3):**

| Entregable | Estado |
|---|---|
| Enlace al repositorio | Hecho: https://github.com/JanHH16/MenuSmart |
| Tag o release evaluable | **Pendiente de Jan** (existe `v1.0.0-ep1`; falta el de la EP2) |
| Enlace al ambiente desplegado | **Pendiente de Jan** (no existe) |
| Enlace al tablero | **Pendiente de Jan** |
| Enlace al prototipo | Hecho (enlace de Figma en el README) |
| README actualizado | Hecho |
| Breve presentación del avance | **Pendiente de Jan** (no hay diapositivas en el repositorio) |
| Demostración funcional | Guion hecho ([guion-demo.md](guion-demo.md)); ensayo pendiente |
| Registro de participación | Borrador hecho; **confirmar** por Jan y el equipo |

## 2. Rúbrica de la Entrega Final (sección 29.4)

| # | Criterio | Peso | Evidencia en el repositorio | Estado | Qué falta |
|---|---|---|---|---|---|
| 1 | Problema, valor y cumplimiento del alcance | 8% | README (problema, objetivos, alcance), [objetivos-e-indicadores.md](objetivos-e-indicadores.md), [evaluacion-recomendador.md](evaluacion-recomendador.md) | **Parcial** | La evidencia de valor es una simulación. La prueba con usuarios está definida y no se hizo (Jan) |
| 2 | Arquitectura e integración técnica | 12% | [ADR-001 a 005](adr/), [architecture.md](architecture.md), contrato validado en ambos lados, [docs/api/](api/README.md) | **Hecho** | Los ADR no registran decisiones de seguridad y observabilidad (están en sus documentos de rama). Servicio Python sin autenticación propia |
| 3 | Frontend multiplataforma, UX y accesibilidad | 10% | Layout adaptable (README), PWA y Android en `feature/pwa-android` ([pwa-y-android.md](pwa-y-android.md)), accesibilidad básica del shell | **Parcial** y **no verificable aquí** | El APK no se compiló ni se probó en un dispositivo; sin auditoría de accesibilidad ni Lighthouse; la URL de la API en Android requiere configuración. La pantalla de sugerencias depende de otra rama |
| 4 | Backend, API, persistencia y control de acceso | 10% | Controladores y DTOs, [docs/api/openapi.json](api/openapi.json), migraciones, transacción en `generar` lista, filtro por `usuarioId`, `JwtAuthGuard` | **Hecho**, con brechas | Un solo rol; la documentación Swagger tiene brechas (descripciones, respuestas, errores 4xx; ver [docs/api/README.md](api/README.md)) |
| 5 | Información web y calidad del procesamiento | 10% | [calidad-de-datos.md](calidad-de-datos.md), ADR-002 y 003, `python-service/app/scrapers/` | **Hecho**, con brechas | Sin programación automática de actualizaciones ni alertas; términos de servicio sin análisis jurídico |
| 6 | Capacidad adaptativa o inteligente | 15% | `backend/src/recommendations/`, [capacidad-adaptativa.md](capacidad-adaptativa.md), evaluación contra versión base, controles del usuario, explicaciones | **Parcial** | Evaluada por simulación; falta la evaluación con usuarios (aceptación, utilidad percibida, comprensión). Pantalla de sugerencias pendiente de integrar. Sin restricciones alimentarias |
| 7 | Pruebas y evaluación del sistema | 10% | Pruebas unitarias (140 + 115 + 70 en verde), e2e del backend, integración NestJS y FastAPI, recuperación, evaluación del recomendador | **Hecho**, con brechas | Las e2e no se ejecutaron en esta revisión; sin pruebas de carga ni de accesibilidad automática; sin cobertura medida (`test:cov`) |
| 8 | DevSecOps, contenedores, IaC y despliegue | 12% | `ci.yml` y workflows (`feature/pipeline-staging`, `feature/ci-auditoria`), `docker-compose.yml`, Dockerfiles, `infra/` | **Pendiente de Jan** y **no verificable aquí** | Sin staging, sin `terraform apply`, rollback no probado, CI no visto en GitHub, protección de ramas sin configurar. Contenedores como root |
| 9 | Observabilidad, seguridad, privacidad y ética | 8% | `feature/observability`, `feature/seguridad` ([seguridad-privacidad-etica.md](seguridad-privacidad-etica.md)) | **Parcial** | Ramas sin unir. Sin alertas automáticas; métricas en memoria; sin roles, recuperación de contraseña ni auditoría de accesibilidad |
| 10 | Documentación, reproducibilidad y trabajo colaborativo | 5% | README, documentos de `docs/`, [registro-participacion.md](registro-participacion.md), [guia-estudio-defensa.md](guia-estudio-defensa.md) | **Parcial** | Confirmar el registro de participación; el historial de git concentra muchos commits en pocos días (ver `registro-participacion.md`); enlaces pendientes |

## 3. Defensa técnica individual (sección 29.5)

Cuatro criterios de 25%: aporte personal, dominio técnico, respuesta a preguntas y limitaciones y mejoras. Preparación en [guia-estudio-defensa.md](guia-estudio-defensa.md) (por componente: qué hace, archivos clave, decisiones y tres preguntas probables con respuesta corta). **Pendiente de cada integrante:** leer el código de sus áreas y completar las celdas "confirmar" de [registro-participacion.md](registro-participacion.md).

## 4. Pasos manuales que solo puede hacer Jan

Marcar cada uno al terminarlo.

### Preparar el repositorio

- [ ] **Unir las ramas** en `develop` (o validar `integration/ep2-ef`), resolver conflictos y correr las pruebas. Orden sugerido: `feature/core-domain`, `feature/ci-auditoria`, `feature/pipeline-staging`, `feature/observability`, `feature/seguridad`, `feature/pwa-android`, `feature/docs-ep2`.
- [ ] **Regenerar** `docs/api/openapi.json` con todo unido (comandos en [docs/api/README.md](api/README.md)) y actualizar las cifras del README si cambian.
- [ ] Revisar que los enlaces del README a `pipeline-y-staging.md`, `seguridad-privacidad-etica.md`, `pwa-y-android.md` y `migraciones-y-auditoria.md` resuelvan después de unir.
- [ ] Hacer los cambios de código que quedaron como hallazgos (sección 5).

### Render y Terraform

- [ ] Crear la cuenta de Render, la API key y el owner id.
- [ ] `cd infra`, completar `terraform.tfvars` (no se commitea), luego `terraform init`, `terraform plan`, `terraform apply` y `terraform output`.
- [ ] Verificar el ambiente: `<backend>/health` en `ok`, el frontend carga y `<frontend>/api/` responde.

### GitHub

- [ ] Crear el environment **`staging`** y cargar `RENDER_API_KEY` (secret) y las variables `RENDER_SERVICE_ID_PYTHON`, `RENDER_SERVICE_ID_BACKEND`, `RENDER_SERVICE_ID_FRONTEND`, `STAGING_BACKEND_URL`, `STAGING_FRONTEND_URL` con los valores de `terraform output` (detalle en [pipeline-y-staging.md](pipeline-y-staging.md)).
- [ ] **Proteger `develop` y `main`:** exigir pull request y que pasen los checks del CI.
- [ ] Hacer un push o pull request y **ver el CI en verde** (incluidos migraciones, integración, Terraform, gitleaks y Trivy); corregir lo que falle.
- [ ] Hacer merge a `develop` para el **primer despliegue automático** y revisar el job `deploy-staging`.
- [ ] **Probar el rollback una vez** con el workflow "Rollback de staging" y un SHA anterior.

### Datos y demostración

- [ ] En staging: registrar la cuenta de demo y **actualizar los precios** (una vez, con anticipación).
- [ ] Preparar el volcado de respaldo de la base con precios (plan B de [guion-demo.md](guion-demo.md)).
- [ ] **Ensayar la demostración con cronómetro** (10 minutos, 8 escenarios).

### Evaluación con usuarios

- [ ] Ejecutar la **prueba con 5 a 10 personas** (protocolo y cuestionario de 5 preguntas en [objetivos-e-indicadores.md](objetivos-e-indicadores.md), sección 4) y anotar los resultados reales en ese documento.

### Android y PWA

- [ ] Ejecutar el workflow `android.yml` y bajar el APK.
- [ ] Configurar la URL absoluta de la API para Android y revisar CORS ([pwa-y-android.md](pwa-y-android.md), pasos pendientes).
- [ ] **Probar el APK en un dispositivo o emulador** (inicio de sesión, plan, lista, comparador, sin conexión).
- [ ] Correr Lighthouse (PWA y accesibilidad) sobre el sitio servido y guardar el resultado.

### Entrega

- [ ] Enlace al **tablero de gestión** y actualización del backlog; ponerlo en el README.
- [ ] Enlace al **staging** en el README.
- [ ] Completar las celdas "confirmar" de [registro-participacion.md](registro-participacion.md) con el equipo y confirmar con la profesora la política de uso de IA.
- [ ] Preparar la breve presentación del avance.
- [ ] **Tag y release.** Ejemplo (elegir el nombre según la convención de `v1.0.0-ep1`):

```bash
git checkout main && git pull
git tag -a v2.0.0-ep2 -m "Entrega Parcial 2"
git push origin v2.0.0-ep2
gh release create v2.0.0-ep2 --title "Entrega Parcial 2" --notes "Ver README y docs/checklist-entrega.md"
```

```powershell
git checkout main; git pull
git tag -a v2.0.0-ep2 -m "Entrega Parcial 2"
git push origin v2.0.0-ep2
gh release create v2.0.0-ep2 --title "Entrega Parcial 2" --notes "Ver README y docs/checklist-entrega.md"
```

- [ ] **Confirmar la fecha** de entrega y demostración con la profesora y si exige el staging en vivo.

## 5. Hallazgos técnicos que requieren cambios de código

Se detectaron al documentar y no se corrigieron porque el trabajo de esta rama se limitó a documentación:

| Hallazgo | Dónde | Efecto |
|---|---|---|
| Swagger incompleto: `auth` e `ingredients` sin descripción; la ruta de ingredientes exige token pero no lo marca; respuestas sin forma (`object`); errores 4xx sin documentar | `backend/src/auth/`, `ingredients/`, DTOs de respuesta | Documentación de la API con brechas ([docs/api/README.md](api/README.md)) |
| `ci.yml` con `--audit-level=critical` y dependencias con vulnerabilidades altas (backend 4, frontend 2) en `feature/core-domain` | `.github/workflows/ci.yml`, `package-lock.json` | Se corrige al unir `feature/ci-auditoria` |
| El filtro de relevancia de productos dejó pasar un picado infantil con zanahoria como "zanahoria" de Santa Isabel ($11.953 por kg) | `backend/src/shopping-lists/relevancia.ts` | Total de Santa Isabel inflado en una lista real |
| `aceite de oliva`, `aceite de coco`, `leche condensada`, `pasta de tomate` y `harina de maíz` se mapean al término genérico | `python-service/app/normalizacion_datos.py` | Costos y reutilización imprecisos |
| Una receta que ya está en el plan sigue apareciendo como sugerencia | `backend/src/recommendations/recommendations.service.ts` | Sugerencias redundantes |
| Los contenedores corren como root | `backend/Dockerfile`, `frontend/Dockerfile`, `python-service/Dockerfile` | Endurecimiento pendiente |
| `GET /api/prices/compare` no aplica el filtro de relevancia que sí usan el costo de la lista y el de las recetas | `backend/src/prices/compare.ts` | Comparación por término menos fiable que la lista |
| `duracionPromedioMs` es la duración de la ejecución completa, no de una consulta | `backend/src/prices/calidad.ts` | Nombre engañoso |
| Sin actualización automática de precios ni alertas | Backend | La frescura depende de una acción manual |

## 6. Contradicciones entre documentos de otras ramas y el código

Detectadas al contrastar los documentos con el código de esta rama; conviene corregirlas al unir:

| Documento (rama) | Dice | Realidad en el código |
|---|---|---|
| `seguridad-privacidad-etica.md` (`feature/seguridad`), sección 10 | La normalización "no reconoce sinónimos" (`palta` y `aguacate` quedan separados) | `python-service/app/normalizacion.py` mapea sinónimos (`aguacate` a `palta`); ver [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md) |
| `seguridad-privacidad-etica.md` (`feature/seguridad`), sección 2 | Los CRUD de comidas y listas "deben seguir la misma regla al implementarse" | Ya están implementados y filtran por `usuarioId` |
| `pwa-y-android.md` (`feature/pwa-android`), pasos pendientes | El backend "no habilita CORS hoy" | `backend/src/setup-app.ts` llama a `app.enableCors()` (CORS abierto a cualquier origen) |
| `pipeline-y-staging.md` (`feature/pipeline-staging`) | `pytest` completo corre "76 pruebas" | El servicio Python de `feature/core-domain` tiene 115 pruebas (las de normalización se agregaron después) |
| `ADR-002` (esta rama, antes de este trabajo) | El scraper "todavía no existe" | Existe (`python-service/app/scrapers/`); la consecuencia se actualizó |
| `README.md` y `docs/database.md` (antes de este trabajo) | Swagger y scraping no existen; `precios_supermercado` vacía | Swagger y scraping existen; ambos documentos se actualizaron |
