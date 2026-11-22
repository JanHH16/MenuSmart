# Guía de estudio para la defensa técnica individual

La defensa se califica de forma individual (10% de la nota final) con cuatro criterios de igual peso: aporte personal, dominio técnico, respuesta a preguntas y limitaciones y mejoras (sección 29.5 del enunciado). Se puede usar el repositorio para buscar evidencia, pero hay que explicar **con palabras propias**. No poder explicar algo que está en el repositorio baja la nota.

Cómo usar esta guía: por cada componente hay qué hace, qué archivos leer, qué se decidió y por qué, y tres preguntas probables con una respuesta corta. Las respuestas son un punto de partida: hay que poder ampliarlas leyendo el código. Algunas rutas dependen de ramas todavía no unidas (se indica).

Orden sugerido de estudio: 1, 2, 3 (la visión general), luego los componentes que uno desarrolló, y al final 18 (limitaciones), que es donde más se pierden puntos por sobreafirmar.

Mapa de documentos: [README](../README.md), [architecture.md](architecture.md), [database.md](database.md), ADR [001](adr/001-infraestructura-render.md) a [005](adr/005-recomendador-adaptativo.md), [checklist-entrega.md](checklist-entrega.md), [registro-participacion.md](registro-participacion.md).

---

## 1. Problema y objetivos

**Qué es.** Planificar comidas y compras consume tiempo y se hace desordenado: no se compara entre supermercados, se repiten ingredientes que sobran y se gasta de más. MenuSmart arma la lista de compras de la semana, estima su costo en Jumbo y Santa Isabel y sugiere recetas baratas que reutilizan ingredientes.

**Archivos clave.** `README.md` (problema, objetivos, alcance), [`objetivos-e-indicadores.md`](objetivos-e-indicadores.md).

**Decisiones.** Tres objetivos medibles: reducir el costo de la compra semanal, reducir el desperdicio (proxy: ingredientes de un solo uso) y ahorrar tiempo. Cada uno tiene indicadores con fórmula, fuente y meta, y se distingue lo medido (simulación con precios reales) de lo que requiere usuarios (aceptación, utilidad, comprensión).

**Preguntas**

1. *¿Cómo sabes que la app reduce el gasto?* En simulación con precios reales, la canasta del menú adaptativo cuesta entre 25% y 56% menos que la aleatoria. Es una simulación, no una medición con personas; la prueba con 5 a 10 personas está definida y pendiente.
2. *¿Qué mide el desperdicio?* No se puede medir directamente. Usamos como indicador indirecto la proporción de ingredientes que se compran para una sola receta: es lo que más probablemente sobra.
3. *¿Por qué dos supermercados?* Jumbo y Santa Isabel comparten plataforma y su `robots.txt` permite las páginas de búsqueda; Líder se descartó porque su `robots.txt` bloquea el catálogo (ADR-002).

## 2. Arquitectura

**Qué es.** Frontend Ionic/Angular, backend NestJS (API, autenticación, reglas, dueño de la base), servicio Python/FastAPI (normalización y scraping, sin acceso a la base) y PostgreSQL.

**Archivos clave.** [`architecture.md`](architecture.md), [ADR-004](adr/004-arquitectura-y-justificacion.md), `docker-compose.yml`.

**Decisiones y por qué.** Un solo dueño de la base (NestJS) para concentrar autenticación, validación y migraciones; Python separado porque el enunciado lo pide y porque aísla el scraping (si cae, no tumba la API); contrato validado en ambos lados; PostgreSQL por el modelo relacional y por `ON CONFLICT` y borrado en cascada; recomendador de reglas porque no hay datos históricos (ADR-005).

**Preguntas**

1. *¿Por qué Python no escribe en la base?* Para que haya un solo dueño del esquema y para que, si la fuente externa entrega datos corruptos, haya dos barreras (Pydantic y el validador de NestJS) antes de la base.
2. *¿Qué pasa si cae el servicio Python?* NestJS responde 503 con un mensaje claro tras un reintento, `/health` pasa a `degraded`, los precios y listas ya guardados siguen disponibles y el recomendador sigue funcionando sin medir la reutilización.
3. *¿Qué riesgo tiene esta arquitectura?* NestJS es punto único de entrada; en staging el servicio Python es público (plan gratuito) y se protege solo con una clave de servicio compartida; el contrato está duplicado en dos lenguajes.

## 3. Flujo de datos

**Qué es.** Dos flujos. (a) **Precios:** tienda, scraper Python (valida), NestJS (valida y persiste con upsert), PostgreSQL, comparador. (b) **Lista de compras:** comidas del usuario, normalización en Python, ítems de la lista, costo con los precios vigentes.

**Archivos clave.** `python-service/app/scrapers/service.py`, `backend/src/prices/prices.service.ts`, `backend/src/shopping-lists/shopping-lists.service.ts`, [`normalizacion-de-ingredientes.md`](normalizacion-de-ingredientes.md) (diagrama).

**Decisiones.** La actualización de precios corre en segundo plano (más de medio minuto por tienda) y se consulta por `GET /api/prices/runs/:id`; los lotes de 5 consultas se persisten en transacciones idempotentes.

**Preguntas**

1. *Cuéntame el camino de un precio desde la tienda hasta la pantalla.* `POST /api/prices/refresh` crea una ejecución por tienda y responde 202; en segundo plano NestJS pide a Python lotes de consultas; Python lee el JSON-LD de la tienda y valida cada producto; NestJS revalida el contrato, deduplica y hace upsert en `productos` y `precios_supermercado`; el comparador consulta el último precio de cada producto.
2. *¿Cómo se llega de "Tomates 500 g" a un costo?* Se normaliza (nombre limpio, término `tomate`, unidad kg), se suma con otras líneas del mismo término, y se busca en cada tienda el producto relevante de menor precio por kg; costo = precio por kg por cantidad.
3. *¿Por qué una ejecución en segundo plano?* Recorrer el catálogo a una solicitud por segundo toma más de 30 segundos por tienda; una petición HTTP síncrona sería frágil.

## 4. Modelo de datos

**Qué es.** Nueve tablas: `users`, `comidas`, `ingredientes`, `productos`, `precios_supermercado`, `ejecuciones_scraping`, `listas_compra`, `lista_compra_items`, `recomendacion_feedback`.

**Archivos clave.** [`database.md`](database.md) (diagrama), `backend/src/**/entities/*.entity.ts`, `backend/src/migrations/`.

**Decisiones.** `productos.slug` único (el slug de la URL identifica el mismo producto en ambas tiendas); un precio por producto, tienda y día (`IDX_precios_tienda_producto_dia`) para cargas idempotentes; `ejecuciones_scraping` con contadores y errores para las métricas de calidad; borrado en cascada desde `users` para el derecho a borrar datos; `reglas` y `nombresOriginales` en jsonb para trazabilidad.

**Preguntas**

1. *¿Cómo evitas duplicados de precios?* Con el índice único `(supermercado, productoId, fechaDia)` y `INSERT ... ON CONFLICT DO UPDATE`: repetir la actualización el mismo día sobrescribe.
2. *¿Cómo se registra la procedencia?* Cada precio guarda tienda, fecha y hora, URL del producto, consulta del catálogo y la ejecución que lo trajo.
3. *¿Qué pasa con los datos de un usuario al borrar su cuenta?* Sus comidas, ingredientes, listas, ítems y feedback se borran por `ON DELETE CASCADE`.

## 5. API REST

**Qué es.** 23 operaciones en NestJS bajo `/api` (más `/health`), más 3 en el servicio Python. Documentadas con OpenAPI.

**Archivos clave.** `backend/src/*/*.controller.ts`, `backend/src/*/dto/`, [`docs/api/README.md`](api/README.md), `openapi.json`.

**Decisiones.** `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`; DTOs con `class-validator`; códigos explícitos (202 en la actualización, 409 si hay una en curso, 429 si hubo una exitosa hace poco, 204 sin contenido); los recursos del usuario se filtran por el id del token.

**Preguntas**

1. *¿Cómo está documentada la API?* Con `@nestjs/swagger` y su plugin: Swagger UI en `/api/docs` y la especificación exportada en `docs/api/openapi.json`. FastAPI publica la suya en `/docs`. Faltan descripciones en algunas rutas y las respuestas aparecen como `object` (limitación documentada).
2. *¿Por qué 409 y 429 en `POST /prices/refresh`?* 409 evita dos actualizaciones simultáneas y 429 protege a las tiendas de abuso (mínimo 10 minutos entre actualizaciones exitosas).
3. *¿Qué valida el backend de lo que entrega Python?* Cada producto contra el contrato (`parseScrapeResponse`); los inválidos se descartan y cuentan, y una respuesta con forma inválida da 502.

## 6. Autenticación y autorización

**Qué es.** Registro e inicio de sesión que entregan un JWT; `JwtAuthGuard` protege todas las rutas salvo salud, registro e inicio de sesión. Un solo rol (usuario autenticado).

**Archivos clave.** `backend/src/auth/` (servicio, módulo, estrategia JWT, DTOs), `backend/src/common/current-user.decorator.ts`. En la rama `feature/seguridad`: política de contraseña, hash de 12 rondas, comprobación de que la cuenta exista en cada solicitud, límites por IP.

**Decisiones.** Contraseñas con bcrypt; `JWT_SECRET` obligatorio (el backend no arranca sin él); expiración configurable (1 hora por defecto); el id del usuario sale del token, nunca del cuerpo ni de la URL.

**Preguntas**

1. *¿Cómo evitas que un usuario vea datos de otro?* Todas las consultas de comidas, listas y feedback filtran por el `usuarioId` del token; si el recurso es de otro, responde 404.
2. *¿Dónde se guarda el token?* En el navegador (`localStorage`); el backend no lo guarda. Es una limitación: un XSS podría robarlo (una cookie `HttpOnly` sería mejor).
3. *¿Qué falta?* Roles (cualquier usuario autenticado puede disparar la actualización de precios), recuperación de contraseña, verificación de correo y revocación de tokens.

## 7. Estrategia de ramas

**Qué es.** Ramas por funcionalidad (`feature/...`) que se unen mediante pull requests a `develop`; `main` recibe las entregas con tag (`v1.0.0-ep1`). Para la EP2 y la EF, ramas por tema que se unen en `integration/ep2-ef`.

**Archivos clave.** [`registro-participacion.md`](registro-participacion.md), historial de git (`git log --all --graph --oneline`).

**Decisiones.** Una rama por tema evita mezclar cambios y permite revisarlos por separado; Conventional Commits en español.

**Preguntas**

1. *¿Por qué ramas separadas para seguridad, observabilidad y pipeline?* Cada una toca archivos distintos y se puede revisar y probar sola; la rama de integración comprueba que conviven.
2. *¿Cómo se protege `main`?* La protección de ramas y los revisores obligatorios se configuran en GitHub; no está verificado desde el repositorio (pendiente en el [checklist](checklist-entrega.md)).
3. *¿Qué mostraría tu aporte en git?* Mis commits por área, pull requests e issues; ver la tabla de [registro-participacion.md](registro-participacion.md). Hay que poder explicar cada uno.

## 8. Pipeline CI/CD (GitHub Actions)

**Qué es.** Jobs de calidad en paralelo (backend, frontend, Python, migraciones, integración NestJS y FastAPI, Terraform, detección de secretos), luego construcción y escaneo de imágenes, y despliegue a staging solo en push a `develop`. Hay un workflow manual de rollback y otro que compila el APK de depuración.

**Archivos clave.** `.github/workflows/ci.yml` (en esta rama: backend, frontend, Python, gitleaks y Trivy; el resto en `feature/ci-auditoria` y `feature/pipeline-staging`), [`pipeline-y-staging.md`](pipeline-y-staging.md), [`migraciones-y-auditoria.md`](migraciones-y-auditoria.md).

**Decisiones.** Quality gate: `docker-images` y `deploy-staging` dependen de los demás jobs. `npm audit --omit=dev --audit-level=high`. Job `migraciones` sobre una base vacía. Despliegue por SHA exacto, no "lo último". Secretos en GitHub Secrets y configuración no sensible en Variables, en el environment `staging`.

**Preguntas**

1. *¿Qué pasa si una dependencia tiene una vulnerabilidad alta?* El job de auditoría falla, por lo que no se construyen las imágenes ni se despliega. Antes el umbral era `critical` y las altas pasaban.
2. *¿Cómo garantizas que la base se reproduce solo con migraciones?* El job `migraciones` crea una base vacía, ejecuta todas las migraciones y `migration:generate --check` falla si hay cambios de entidades sin migración.
3. *¿El despliegue a staging funciona?* El pipeline y los scripts están listos y probados contra un servidor simulado; el ambiente real no existe porque `terraform apply` no se ejecutó. No se puede afirmar que el despliegue funciona de extremo a extremo hasta hacerlo.

## 9. Docker

**Qué es.** Un `Dockerfile` por componente y `docker-compose.yml` con los cuatro servicios, healthchecks y orden de arranque (`depends_on` con condición de salud).

**Archivos clave.** `backend/Dockerfile` (multi-etapa: compilación, dependencias de producción, imagen `node:24-slim`), `frontend/Dockerfile` (compila y sirve con nginx), `python-service/Dockerfile`, `docker-compose.yml`, `.dockerignore`.

**Decisiones.** Multi-etapa para que la imagen final no lleve herramientas de compilación; el backend corre con `NODE_ENV=production` (migraciones al arrancar, sin `synchronize`); el servicio Python no se expone a internet en el despliegue.

**Preguntas**

1. *¿Cómo se levanta todo?* Copiar `.env.example` a `.env`, completar y `docker compose up --build`; los servicios esperan a que la base y Python estén sanos.
2. *¿Cómo se escanean las imágenes?* Con Trivy en el CI (severidad `CRITICAL` y `HIGH`, ignorando lo sin corrección), con exclusiones en `.trivyignore`.
3. *¿Qué falta en las imágenes?* Los contenedores corren como root (no hay instrucción `USER`); sería una mejora de endurecimiento.

## 10. Terraform e infraestructura

**Qué es.** `infra/` define en el proveedor Render: una base `render_postgres` y tres servicios web (Python, backend y frontend), por defecto en plan gratuito (`instance_plan`). El servicio Python tiene URL pública, así que exige la clave `X-Service-Key`.

**Archivos clave.** `infra/services.tf`, `infra/database.tf`, `infra/variables.tf`, `infra/terraform.tfvars.example`, [ADR-001](adr/001-infraestructura-render.md).

**Decisiones.** Render por soportar contenedores Docker y plan gratuito; como el plan gratuito no tiene servicios privados, el servicio Python es público pero protegido con una clave compartida con el backend, porque el frontend no debe llamarlo (ver el riesgo en ADR-001); variables sensibles (`jwt_secret`, `python_service_key`, clave de Render) con `sensitive` y fuera del repositorio (`terraform.tfvars` está en `.gitignore`); el CI solo valida (`fmt`, `validate`), nunca aplica.

**Preguntas**

1. *¿Está desplegado?* No: `terraform apply` no se ha ejecutado; la infraestructura está definida y validada pero no hay ambiente en vivo.
2. *¿Cómo llegan los secretos a Render?* Terraform los pasa como variables de entorno del servicio, tomándolos de `terraform.tfvars` local; nunca pasan por GitHub ni por el repositorio.
3. *¿Cómo se revierte un despliegue?* Con el workflow manual "Rollback de staging" por SHA, o desde el panel de Render; no revierte migraciones de base de datos.

## 11. Pruebas

**Qué es.** Unitarias en los tres componentes, e2e del backend contra PostgreSQL real, integración NestJS contra el servicio Python real (en CI) y pruebas de recuperación ante fallas.

**Archivos clave.** `backend/src/**/*.spec.ts`, `backend/test/*.e2e-spec.ts`, `python-service/tests/`, `frontend/src/**/*.spec.ts`.

**Cifras (22-11-2026, en local):** backend 140 pruebas unitarias (13 suites), Python 115, frontend 70. Las e2e no se ejecutaron para este documento (necesitan base de datos).

**Decisiones.** Las pruebas del scraper usan páginas congeladas (fixtures) para no depender de internet; el parser y el contrato son los reales. Las funciones puras (costo, puntaje, calidad, normalización) se prueban sin base de datos.

**Preguntas**

1. *¿Cómo pruebas el scraper sin consultar las tiendas?* Con HTML capturado de las tiendas y un cliente HTTP simulado; las pruebas detectan cambios en el parser, no cambios en el sitio real.
2. *¿Qué pruebas muestran resiliencia?* Timeout con reintentos, error 503 que se recupera, bloqueo 429 sin reintento, página sin estructura, robots no disponible, caída parcial y el e2e "si el servicio Python no responde, los datos anteriores siguen disponibles".
3. *¿Qué no se prueba?* No hay pruebas de carga, de accesibilidad automáticas ni pruebas de interfaz de extremo a extremo con navegador.

## 12. Seguridad

**Qué es.** Controles de autenticación, validación, límites, secretos y dependencias. Documento completo en la rama `feature/seguridad`: `docs/seguridad-privacidad-etica.md`.

**Archivos clave.** `backend/src/setup-app.ts` (validación; helmet y proxy en la rama de seguridad), `backend/src/auth/`, `.gitleaks.toml`, `.trivyignore`, workflows.

**Decisiones.** Validación estricta con whitelist, consultas SQL parametrizadas (incluido el SQL manual de `prices.sql.ts`), secretos fuera del repositorio, detección de secretos y de vulnerabilidades en cada push, servicio Python privado.

**Preguntas**

1. *¿Cómo evitas inyección SQL?* TypeORM parametriza y el SQL manual usa solo parámetros posicionales, sin concatenar texto.
2. *¿Cómo evitas fugas de secretos?* `.env` fuera de git, `.env.example` con valores de ejemplo, gitleaks sobre todo el historial en CI, secretos de producción como variables `sensitive` de Terraform y redacción de secretos en los logs (rama de observabilidad y seguridad).
3. *¿Qué riesgos quedan?* CORS abierto, token en `localStorage`, sin roles ni recuperación de contraseña, límites de solicitudes en memoria y términos de servicio de las tiendas sin análisis jurídico.

## 13. Obtención de información web (scraping)

**Qué es.** El servicio Python lee el bloque JSON-LD (`ItemList`) de la búsqueda de Jumbo y Santa Isabel para 31 términos del catálogo.

**Archivos clave.** `python-service/app/scrapers/` (`service.py`, `parser.py`, `normalizer.py`, `robots.py`, `stores.py`, `schemas.py`, `config.py`), [ADR-002](adr/002-fuentes-datos-web.md), [ADR-003](adr/003-metodo-scraping.md), [`calidad-de-datos.md`](calidad-de-datos.md).

**Decisiones.** Se prefirió el JSON-LD (datos estructurados que la propia tienda publica) a parsear HTML o CSS, que se rompen con cualquier cambio visual; intérprete propio de `robots.txt` con comodines (el de la biblioteca estándar no los soporta); una solicitud por segundo, timeout de 10 s, 2 reintentos con espera creciente, sin reintentar ante 403 o 429; redirecciones solo dentro del dominio y respuesta máxima de 5 MB; validación de cada registro y deduplicación por slug.

**Preguntas**

1. *¿Es legal scrapear?* Se respeta `robots.txt`, se limita la carga y se leen solo datos públicos. Los términos de servicio no se analizaron jurídicamente; el uso es académico y de bajo volumen. Es una limitación declarada.
2. *¿Qué pasa si la tienda cambia su HTML?* La consulta falla con el error `estructura`, no se guardan datos nuevos y los precios anteriores siguen disponibles con su fecha.
3. *¿Cómo sabes que los datos son buenos?* `GET /api/prices/quality`: el 22-11-2026, 99,5% (Jumbo) y 95,8% (Santa Isabel) de registros válidos, 0% de descartes y errores y cobertura de 31 de 31 términos. "Válido" es validez de formato, no de relevancia.

## 14. Capacidad adaptativa

**Qué es.** Recomendador de recetas por costo por porción y reutilización de ingredientes, con explicación y controles.

**Archivos clave.** `backend/src/recommendations/` (`scoring.ts`, `recommendations.service.ts`, `recetas.ts`), [`capacidad-adaptativa.md`](capacidad-adaptativa.md), [ADR-005](adr/005-recomendador-adaptativo.md), [`evaluacion-recomendador.md`](evaluacion-recomendador.md).

**Decisiones.** Reglas y puntaje (sin datos históricos no se puede entrenar un modelo, y la explicabilidad es un requisito); pesos 60/40 por defecto, ajustables; recetas sin precios suficientes van al final con aviso; comparación contra versiones base.

**Preguntas**

1. *Explica la fórmula.* `puntaje = pesoCosto x costoNormalizado + (1 - pesoCosto) x reutilización`; el costo se normaliza entre la receta más barata y la más cara del conjunto; la reutilización es la fracción de ingredientes de la receta que ya están en el plan.
2. *¿Por qué no aprendizaje automático?* No hay historial de uso; un modelo entrenado con datos sintéticos no demostraría nada sobre el problema real, y las reglas son transparentes y evaluables contra una base.
3. *¿Cuál es el sesgo?* Favorece recetas baratas (legumbres, papas, huevos) y puede repetir platos; no considera restricciones alimentarias. El usuario puede bajar el peso del costo, excluir ingredientes, rechazar o desactivar la adaptación.

## 15. Observabilidad

**Qué es.** `/health` que verifica base de datos y servicio Python; en la rama `feature/observability`, logs JSON con identificador de solicitud que viaja de NestJS a Python, errores de la fuente externa registrados y métricas de tiempo de respuesta por ruta (`/api/metrics`).

**Archivos clave.** `backend/src/health/health.controller.ts`, rama de observabilidad: `backend/src/observability/` y `python-service/app/observability.py`.

**Decisiones.** El id de solicitud (`X-Request-ID`) permite seguir una petición por los dos servicios; los logs redactan contraseñas y tokens; las métricas viven en memoria (simples, sin infraestructura adicional).

**Preguntas**

1. *¿Cómo sigues una petición entre NestJS y Python?* Con el identificador de solicitud que NestJS genera y propaga en la cabecera; aparece en los logs de ambos servicios.
2. *¿Qué indica `/health`?* `ok` si la base y Python responden; `degraded` si alguno falla (con HTTP 200 y el detalle por dependencia).
3. *¿Qué limitaciones tiene?* Las métricas se reinician con el proceso, no hay almacenamiento persistente ni alertas automáticas.

## 16. Métricas

**Qué es.** Tres familias: calidad de datos (`/api/prices/quality`), evaluación del recomendador (`npm run evaluar:recomendador`) y rendimiento (`/api/metrics`).

**Archivos clave.** `backend/src/prices/calidad.ts`, `backend/scripts/evaluar-recomendador.ts`, [`calidad-de-datos.md`](calidad-de-datos.md), [`objetivos-e-indicadores.md`](objetivos-e-indicadores.md).

**Decisiones.** Los porcentajes de calidad se calculan sobre las últimas 10 ejecuciones por tienda; la evaluación usa semilla fija para ser reproducible; "ingrediente de un solo uso" como proxy declarado de desperdicio.

**Preguntas**

1. *¿Qué mide `porcentajeValidos`?* Registros que pasaron la validación sobre los extraídos; no mide si el producto es el adecuado.
2. *¿Qué significa que la canasta adaptativa sea 25% a 56% más barata?* En una simulación con precios reales, comparada con una versión aleatoria; es esperable porque el sistema optimiza costo. Lo informativo es el efecto de la reutilización.
3. *¿Qué métrica falta?* Las de usuarios: aceptación real, utilidad percibida, comprensión y tiempo ahorrado.

## 17. Privacidad y accesibilidad

**Qué es.** Datos personales mínimos (correo, nombre, hash de la contraseña, comidas y listas), borrado de cuenta en cascada, sin cookies ni analítica. Accesibilidad básica del shell (foco visible, etiquetas, reducción de movimiento, aviso de conexión).

**Archivos clave.** `docs/seguridad-privacidad-etica.md` (rama `feature/seguridad`), `docs/pwa-y-android.md` (rama `feature/pwa-android`), [`capacidad-adaptativa.md`](capacidad-adaptativa.md) sección 9.

**Decisiones.** El recomendador solo guarda aceptado o rechazado; los precios son públicos y no se asocian a usuarios; el scraping no envía datos del usuario.

**Preguntas**

1. *¿Qué datos personales guardas y cómo se borran?* Correo, nombre, hash de contraseña y los datos que el usuario crea; `DELETE /api/users/me` (rama de seguridad) borra la cuenta y, en cascada, todo lo suyo.
2. *¿Cómo garantizas accesibilidad?* No se puede afirmar una garantía: hay una base (Ionic, foco visible, etiquetas en la navegación, respeto de `prefers-reduced-motion`), pero no se hizo una auditoría completa ni hay pruebas automáticas de accesibilidad.
3. *¿Qué riesgo de privacidad tiene el plan de comidas?* Puede revelar hábitos de alimentación; solo lo ve su dueño y se borra con la cuenta.

## 18. Limitaciones del sistema

**Qué es.** Lo que no está o no se pudo verificar. Para la defensa, conocerlas bien suma: el criterio "reconoce ventajas, limitaciones y posibles mejoras" pesa en la rúbrica.

**Archivos clave.** Sección "Limitaciones conocidas" del [README](../README.md), [`checklist-entrega.md`](checklist-entrega.md).

**Lista corta para tener en la cabeza**

- No hay staging desplegado (`terraform apply` pendiente) ni se ha probado el rollback.
- El APK de Android no se compiló ni se probó en un dispositivo.
- La actualización de precios es manual; la fuente es frágil y sus términos de servicio no se analizaron jurídicamente.
- La normalización es léxica (error conocido: "leche condensada" como "leche"); el catálogo es de 31 ingredientes.
- La estimación de costo puede elegir productos poco representativos.
- El recomendador es de reglas, con 25 recetas, sin restricciones alimentarias; la evidencia es una simulación y falta la prueba con usuarios.
- Seguridad: sin roles, sin recuperación de contraseña, CORS abierto.
- Las opciones de preferencias, supermercados favoritos y notificaciones del perfil son solo visuales.

**Preguntas**

1. *¿Qué es lo más débil del proyecto?* Que la utilidad no se ha medido con personas y que el ambiente de staging no existe todavía; ambos tienen un plan definido (protocolo de usuarios y pasos manuales de despliegue).
2. *¿Qué mejorarías primero?* Desplegar staging y medir con 5 a 10 usuarios; luego la actualización automática de precios y un filtro de relevancia de productos más robusto.
3. *¿Qué harías si el scraper deja de funcionar?* La app sigue con los últimos precios y su fecha; se detecta por el estado `fallido` o `parcial` de las ejecuciones y el error `estructura`; se corrige el parser y se actualizan las fixtures.

---

## Preguntas transversales (para cualquier integrante)

1. *¿Cuál fue tu aporte personal y dónde está la evidencia?* Citar commits, pull requests y documentos concretos (ver [registro-participacion.md](registro-participacion.md)); es el 25% de la nota.
2. *¿Usaron asistencia de IA?* Sí, con Claude (Anthropic), bajo la dirección del equipo, que decidió alcance y prioridades y revisó cada cambio; ver la sección "Uso de asistencia de IA" de [registro-participacion.md](registro-participacion.md). Hay que poder explicar cualquier línea del repositorio.
3. *¿Qué decisión cambiarías con más tiempo?* Una respuesta con fundamento: por ejemplo, probar el despliegue real y medir con usuarios antes de ampliar funcionalidades.
