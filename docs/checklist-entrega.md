# Checklist de entrega

Contraste honesto del repositorio con las rúbricas de la **EP2** (sección 29.3 del enunciado) y de la **Entrega Final** (sección 29.4), sobre la rama `integration/ep2-ef` (22-11-2026). Para cada criterio: peso, evidencia, estado y qué falta.

**Estados:**

- **Hecho:** existe y se verificó (la columna de evidencia dice cómo).
- **Parcial:** existe pero tiene una brecha que se nombra.
- **Pendiente de Jan:** requiere una acción manual fuera del repositorio.
- **No verificable aquí:** depende de GitHub, de Render o de un dispositivo y no se pudo comprobar desde el entorno de desarrollo.

**Qué se ejecutó para esta revisión (en local):**

| Verificación | Resultado |
|---|---|
| Pruebas del backend (unitarias y e2e, contra PostgreSQL) | 247 en verde, cobertura de 97,8% de sentencias y 81,4% de ramas |
| Pruebas del servicio Python | 149 en verde, cobertura de 96% |
| Pruebas del frontend | 109 en verde, cobertura de 57,7% de sentencias |
| Lint de los tres proyectos y build de producción del frontend y del backend | Sin errores |
| 5 migraciones sobre una base vacía y `migration:generate --check` | Sin deriva |
| `npm audit --omit=dev --audit-level=high` y `pip-audit` | Sin vulnerabilidades altas ni críticas (ver `docs/migraciones-y-auditoria.md`) |
| `actionlint` sobre los tres workflows | Sin errores |
| Imágenes Docker del frontend y de Python (construcción y arranque), imagen del backend (construcción y usuario) | Corren sin root |
| axe-core en 9 pantallas, escritorio y móvil | Sin infracciones (`docs/accesibilidad.md`) |
| App completa (Python, backend, frontend) contra la base con precios reales, en el navegador | Plan, lista con costo, sugerencias, comparador y perfil funcionando |

**No se ejecutó:** el pipeline en GitHub Actions, `terraform plan/apply`, el despliegue en Render, la compilación del APK ni nada en un dispositivo Android.

## 1. Rúbrica de la EP2 (sección 29.3)

| # | Criterio | Peso | Evidencia | Estado | Qué falta |
|---|---|---|---|---|---|
| 1 | Continuidad y correcciones de la EP1 | 5% | [correcciones-ep1.md](correcciones-ep1.md): las 6 observaciones con su evidencia (ADR 004, objetivos e indicadores, job de migraciones, Swagger, normalización, auditoría en `high`) | **Parcial** | Enlace al tablero y actualización del backlog (Jan) |
| 2 | Fuente web, procedencia y uso responsable | 10% | [ADR-002](adr/002-fuentes-datos-web.md), [ADR-003](adr/003-metodo-scraping.md), [calidad-de-datos.md](calidad-de-datos.md), [seguridad-privacidad-etica.md](seguridad-privacidad-etica.md) | **Parcial** | `robots.txt`, frecuencia, procedencia y propósito están documentados y probados. Falta el análisis jurídico de los términos de servicio de las tiendas |
| 3 | Recuperación, limpieza y calidad de datos | 15% | `python-service/app/scrapers/`, pruebas del scraper, [calidad-de-datos.md](calidad-de-datos.md) (99,5% y 95,8% de registros válidos, 31 de 31 de cobertura) | **Hecho**, con brechas | La actualización es manual (sin programación). Sin detección de precios atípicos |
| 4 | Procesamiento Python e integración con NestJS | 15% | [normalizacion-de-ingredientes.md](normalizacion-de-ingredientes.md), [ADR-004](adr/004-arquitectura-y-justificacion.md), cliente con timeouts y reintento, contrato validado en ambos lados, prueba de integración con el servicio Python real (`backend/test/python-real.integration-spec.ts`) | **Hecho** | La normalización es léxica (limitaciones documentadas) |
| 5 | Persistencia, indexación y consulta | 10% | 5 migraciones sin deriva, [database.md](database.md), índices únicos, `prices.sql.ts` | **Hecho** | El historial es un precio por producto, tienda y día |
| 6 | Evaluación de la información recuperada | 10% | [calidad-de-datos.md](calidad-de-datos.md) (definiciones, fórmulas, valores reales), [plan-de-pruebas.md](plan-de-pruebas.md) | **Hecho**, con brecha | Una ejecución por tienda (sin tendencia). No se midió la precisión del emparejamiento producto con ingrediente |
| 7 | Integración de extremo a extremo | 12% | Flujo tienda, Python, NestJS, PostgreSQL y frontend ejecutado en local con datos reales, incluida la interfaz en el navegador | **Parcial** | **Pendiente de Jan:** demostrarlo en staging, que aún no existe |
| 8 | Diseño de la capacidad adaptativa | 8% | [capacidad-adaptativa.md](capacidad-adaptativa.md) (9 preguntas), [ADR-005](adr/005-recomendador-adaptativo.md); además ya está implementada | **Hecho** | |
| 9 | Pipeline, staging, seguridad y observabilidad | 10% | `ci.yml` con 9 jobs, [pipeline-y-staging.md](pipeline-y-staging.md), logs JSON con id de solicitud, `/api/metrics`, helmet, límite de solicitudes, [seguridad-privacidad-etica.md](seguridad-privacidad-etica.md) | **Parcial** y **no verificable aquí** | Ver el CI verde en GitHub y crear el staging (Jan) |
| 10 | Documentación, trazabilidad y demostración | 5% | [README](../README.md), [docs/api/](api/README.md), [guion-demo.md](guion-demo.md), [registro-participacion.md](registro-participacion.md) | **Parcial** | Celdas "confirmar" del registro, enlaces a tablero y staging, ensayo de la demostración |

**Entregables del formato común (sección 24.3):**

| Entregable | Estado |
|---|---|
| Enlace al repositorio | Hecho: https://github.com/JanHH16/MenuSmart |
| Tag o release evaluable | **Pendiente de Jan** (existe `v1.0.0-ep1`; falta el de la EP2) |
| Enlace al ambiente desplegado | **Pendiente de Jan** (no existe) |
| Enlace al tablero | **Pendiente de Jan** |
| Enlace al prototipo | Hecho (Figma, en el README) |
| README actualizado | Hecho |
| Breve presentación del avance | **Pendiente de Jan** (no hay diapositivas) |
| Demostración funcional | Guion hecho ([guion-demo.md](guion-demo.md)); ensayo pendiente |
| Registro de participación | Borrador hecho; **confirmar** por Jan y el equipo |

## 2. Rúbrica de la Entrega Final (sección 29.4)

| # | Criterio | Peso | Evidencia | Estado | Qué falta |
|---|---|---|---|---|---|
| 1 | Problema, valor y cumplimiento del alcance | 8% | README, [objetivos-e-indicadores.md](objetivos-e-indicadores.md), [evaluacion-recomendador.md](evaluacion-recomendador.md); plan semanal, lista con costo, comparador y sugerencias funcionando con datos reales | **Parcial** | La evidencia de valor es una simulación. La prueba con usuarios está definida y no se hizo (Jan) |
| 2 | Arquitectura e integración técnica | 12% | [ADR 001 a 005](adr/), [architecture.md](architecture.md), contrato validado en ambos lados, [docs/api/](api/README.md) | **Hecho** | Servicio Python sin autenticación propia (es interno en Render) |
| 3 | Frontend multiplataforma, UX y accesibilidad | 10% | Layout dual escritorio y móvil, PWA con modo sin conexión (verificado en Edge: [pwa-y-android.md](pwa-y-android.md)), proyecto Android, [accesibilidad.md](accesibilidad.md) (axe sin infracciones en 9 pantallas x 2 formatos) | **Parcial** y **no verificable aquí** | El APK no se compiló ni se probó en un dispositivo; sin lector de pantalla ni Lighthouse |
| 4 | Backend, API, persistencia y control de acceso | 10% | Controladores y DTO validados, [openapi.json](api/openapi.json) (26 operaciones, todas con resumen y errores documentados), migraciones sin deriva, transacciones, aislamiento por usuario con e2e de dos usuarios, borrado de cuenta en cascada | **Hecho**, con brechas | Un solo rol; las respuestas de varios endpoints aparecen como `object` sin campos en Swagger |
| 5 | Información web y calidad del procesamiento | 10% | [calidad-de-datos.md](calidad-de-datos.md), ADR-002 y 003, `python-service/app/scrapers/` | **Hecho**, con brechas | Sin actualización automática ni alertas; términos de servicio sin análisis jurídico |
| 6 | Capacidad adaptativa o inteligente | 15% | `backend/src/recommendations/`, pantalla de sugerencias, [capacidad-adaptativa.md](capacidad-adaptativa.md), evaluación contra versión base ([evaluacion-recomendador.md](evaluacion-recomendador.md)), explicaciones, aceptar, rechazar, pesos, exclusiones y modo sin adaptación | **Hecho**, con brecha | Evaluada por simulación; falta la evaluación con usuarios (aceptación, utilidad percibida, comprensión). Sin restricciones alimentarias |
| 7 | Pruebas y evaluación del sistema | 10% | [plan-de-pruebas.md](plan-de-pruebas.md): 505 pruebas, cobertura medida y exigida en CI, tiempos de respuesta, recuperación, evaluación del recomendador | **Hecho**, con brechas | Sin pruebas de carga ni de interfaz de punta a punta |
| 8 | DevSecOps, contenedores, IaC y despliegue | 12% | `ci.yml` (lint, pruebas con cobertura, migraciones, integración, Terraform, auditoría `high`, gitleaks, Trivy, despliegue a staging con health checks), workflow de rollback, `docker-compose.yml`, imágenes sin root, `infra/` validada | **Pendiente de Jan** y **no verificable aquí** | Sin staging ni `terraform apply`; rollback no probado; CI no visto en GitHub; protección de ramas sin configurar |
| 9 | Observabilidad, seguridad, privacidad y ética | 8% | Logs estructurados y correlacionados, `/health`, `/api/metrics`, helmet, límite de solicitudes, redacción de secretos en logs, [seguridad-privacidad-etica.md](seguridad-privacidad-etica.md), eliminación de cuenta | **Hecho**, con brechas | Sin alertas automáticas; métricas en memoria; sin roles ni recuperación de contraseña |
| 10 | Documentación, reproducibilidad y trabajo colaborativo | 5% | README, documentos de `docs/`, [registro-participacion.md](registro-participacion.md), [guia-estudio-defensa.md](guia-estudio-defensa.md) | **Parcial** | Confirmar el registro de participación; el historial de git concentra muchos commits en pocos días (ver ese documento); enlaces pendientes |

## 3. Defensa técnica individual (sección 29.5)

Cuatro criterios de 25%: aporte personal, dominio técnico, respuesta a preguntas y limitaciones y mejoras. Preparación en [guia-estudio-defensa.md](guia-estudio-defensa.md) (por componente: qué hace, archivos clave, decisiones y tres preguntas probables con respuesta corta). **Pendiente de cada integrante:** leer el código de sus áreas y completar las celdas "confirmar" de [registro-participacion.md](registro-participacion.md). La rúbrica exige poder explicar el código del repositorio: la guía ayuda, pero no reemplaza haberlo leído.

## 4. Pasos manuales que solo puede hacer Jan

Marcar cada uno al terminarlo.

### Subir y unir el trabajo

- [ ] `git push -u origin integration/ep2-ef` si aún no está en GitHub, y abrir **una** pull request de `integration/ep2-ef` hacia `develop` (reúne todas las ramas de trabajo con sus commits).
- [ ] Esperar el CI. Si falla algo, copiar el log y corregirlo en la misma rama.
- [ ] Merge con **"Create a merge commit"** y luego `git fetch --prune`.
- [ ] Cerrar sin merge las PR antiguas (#18 y las encadenadas) si GitHub no las marca como incluidas.

### Render y Terraform

- [ ] Crear la cuenta de Render, la API key y el owner id.
- [ ] `cd infra`, completar `terraform.tfvars` (no se commitea), luego `terraform init`, `terraform plan`, `terraform apply` y `terraform output`.
- [ ] Verificar: `<backend>/health` en `ok`, el frontend carga y `<frontend>/api/` responde.

### GitHub

- [ ] Crear el environment **`staging`** con el secret `RENDER_API_KEY` y las variables `RENDER_SERVICE_ID_PYTHON`, `RENDER_SERVICE_ID_BACKEND`, `RENDER_SERVICE_ID_FRONTEND`, `STAGING_BACKEND_URL` y `STAGING_FRONTEND_URL` (detalle en [pipeline-y-staging.md](pipeline-y-staging.md)).
- [ ] **Proteger `develop` y `main`:** exigir pull request y los checks del CI.
- [ ] Ver el job `deploy-staging` tras el merge a `develop` y **probar el rollback una vez** con el workflow "Rollback de staging" y un SHA anterior.

### Datos y demostración

- [ ] En staging: registrar la cuenta de demo y **actualizar los precios** una vez, con anticipación.
- [ ] Preparar el volcado de respaldo de la base con precios (plan B de [guion-demo.md](guion-demo.md)).
- [ ] **Ensayar la demostración con cronómetro** (10 minutos, 8 escenarios).

### Evaluación con usuarios

- [ ] Ejecutar la **prueba con 5 a 10 personas** (protocolo y cuestionario en [objetivos-e-indicadores.md](objetivos-e-indicadores.md), sección 4) y anotar los resultados reales en ese documento.

### Android y PWA

- [ ] Ejecutar el workflow `android.yml` y bajar el APK (la variable `STAGING_BACKEND_URL` debe existir antes).
- [ ] **Probar el APK en un dispositivo o emulador:** inicio de sesión, plan, lista, comparador, sin conexión.
- [ ] Correr Lighthouse (PWA y accesibilidad) sobre el sitio servido y guardar el resultado.

### Entrega

- [ ] Enlace al **tablero de gestión** y actualización del backlog; ponerlo en el README.
- [ ] Enlace al **staging** en el README.
- [ ] Completar las celdas "confirmar" de [registro-participacion.md](registro-participacion.md) con el equipo y confirmar con la profesora la política de uso de IA.
- [ ] Preparar la breve presentación del avance.
- [ ] **Tag y release de la EP2**, con la fecha real (no se modifica el historial):

```powershell
git checkout main; git pull
git tag -a v1.1.0-ep2 -m "Entrega Parcial 2"
git push origin v1.1.0-ep2
gh release create v1.1.0-ep2 --title "Entrega Parcial 2" --notes "Ver README y docs/checklist-entrega.md"
```

- [ ] **Confirmar la fecha** de entrega y demostración con la profesora, y si exige el staging en vivo.
- [ ] Para la Entrega Final, repetir con `v2.0.0-ef` cuando esté lista.

## 5. Hallazgos conocidos que no se corrigieron

| Hallazgo | Dónde | Efecto |
|---|---|---|
| Una receta que ya está en el plan sigue apareciendo como sugerencia (la pantalla la marca "ya en tu semana") | `backend/src/recommendations/recommendations.service.ts` | Sugerencias redundantes; aceptar dos veces duplica la comida |
| `GET /api/prices/compare` no aplica el filtro de relevancia que sí usan el costo de la lista y el de las recetas | `backend/src/prices/compare.ts` | La comparación por término es menos fiable que la lista; la pantalla del comparador usa los productos idénticos en ambas tiendas y no se ve afectada |
| `aceite de oliva` se mapea al aceite genérico, y otros nombres compuestos pueden mapearse al término más cercano | `python-service/app/normalizacion_datos.py` | Costo impreciso en esos casos |
| El filtro de relevancia es por nombre: puede dejar pasar un producto que nombra el ingrediente sin serlo | `backend/src/shopping-lists/relevancia.ts` | Costo estimado con error en algún ítem |
| `duracionPromedioMs` en la calidad de datos es la duración de la ejecución completa, no de una consulta | `backend/src/prices/calidad.ts` | Nombre engañoso |
| Sin actualización automática de precios ni alertas | Backend | La frescura depende de una acción manual |
| Respuestas de varios endpoints documentadas como `object` sin campos | Controladores | Swagger menos útil |
| Límite de solicitudes y métricas en memoria, por instancia | `rate-limit.ts`, `metrics.service.ts` | Con varias instancias cada una cuenta aparte |
