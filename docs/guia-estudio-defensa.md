# Guía de estudio para la presentación y la defensa técnica individual

**Documento único** para que Jan y Camila estudien el mismo material y respondan de forma coherente. Reúne la guía por componente, el guion de la demostración en el staging, el plan de práctica de hoy y de mañana, el resumen del registro de participación y el esquema de la presentación. Está verificado contra el repositorio al **22-11-2026** (rama `develop`). Si algo cambia en el código, hay que actualizar la sección correspondiente.

- **Repositorio:** https://github.com/JanHH16/MenuSmart
- **Staging (plan gratuito de Render):** sitio https://menusmart-staging-frontend.onrender.com, API https://menusmart-staging-backend.onrender.com, Swagger https://menusmart-staging-backend.onrender.com/api/docs
- **Regla de oro de la defensa:** se explica **con palabras propias**, se señala **dónde está la evidencia** (archivo, commit, documento) y se **reconocen las limitaciones sin que lo pidan**. No poder explicar algo que está en el repositorio baja la nota individual (enunciado, sección 28).

---

# Parte A. Antes de estudiar

## 0. Cómo usar esta guía y plan de estudio para hoy

Cada componente tiene: **qué es**, **archivos para leer**, **decisiones y por qué**, y **tres preguntas probables con respuesta corta**. Las respuestas son un punto de partida: hay que poder ampliarlas leyendo el código.

**Plan sugerido (unas 4 horas, entre los dos):**

| Bloque | Qué | Tiempo |
|---|---|---|
| 1 | Secciones 1, 2 y 3 juntos, en voz alta | 30 min |
| 2 | Sección 4 (participación e IA): decidir juntos qué dirá cada uno | 30 min |
| 3 | Componentes de la Parte B: cada uno estudia los suyos y le explica un resumen al otro (Camila: 11, 14 y 23; Jan: 6, 7, 9, 12, 13, 20 a 22). Ambos leen 5, 10, 15, 16 y 24 | 90 min |
| 4 | Sección 26 (preguntas difíciles): se preguntan al azar el uno al otro | 40 min |
| 5 | Ensayo de la demo en el staging (sección 25) con cronómetro. El plan hora por hora de hoy y de mañana está en la sección 30 | 40 min |

**Cómo responder:**

1. Empieza por la respuesta, después el detalle (30 a 60 segundos por pregunta).
2. Nombra un archivo o documento: "eso está en `backend/src/recommendations/scoring.ts`".
3. Si no recuerdas algo: "no lo tengo presente, lo busco en X" y ábrelo. Está permitido apoyarse en el repositorio (sección 29.5).
4. Evita "garantiza", "es seguro", "es 100 %". Usa "reduce el riesgo", "cumple en las pruebas que hicimos".
5. Si la pregunta toca una limitación, reconócela. La rúbrica premia conocer las limitaciones.

**Mapa de documentos del repositorio:** [README](../README.md), [architecture.md](architecture.md), [database.md](database.md), ADR [001](adr/001-infraestructura-render.md) a [005](adr/005-recomendador-adaptativo.md), [checklist-entrega.md](checklist-entrega.md), [registro-participacion.md](registro-participacion.md), [pipeline-y-staging.md](pipeline-y-staging.md), [guion-demo.md](guion-demo.md).

## 1. El proyecto en 2 minutos

**Problema.** Planificar las comidas de la semana y hacer las compras es desordenado: no se compara entre supermercados, se compran ingredientes que sobran y se gasta de más.

**Solución.** MenuSmart permite armar un plan semanal de comidas, genera la lista de compras (suma los ingredientes repetidos y los lleva a unidades comparables), estima cuánto cuesta esa lista en **Jumbo** y en **Santa Isabel** con precios reales, y **sugiere recetas baratas que reutilizan ingredientes** que ya planificaste, explicando por qué.

**Cómo está hecho (en una frase por pieza):**
- **Frontend Angular + Ionic** (PWA, y proyecto Android con Capacitor): lo que ve el usuario.
- **Backend NestJS**: la API, la autenticación y las reglas. Es el único dueño de la base de datos.
- **Servicio Python (FastAPI)**: lee los precios de las tiendas (scraping responsable) y normaliza ingredientes. No toca la base de datos.
- **PostgreSQL**: guarda usuarios, comidas, listas, productos y precios, con migraciones.
- **DevSecOps**: GitHub Actions (pruebas, seguridad, imágenes Docker, despliegue), Terraform y Render (staging).

**Capacidad adaptativa (15 % de la Entrega Final):** un recomendador basado en reglas y puntaje, explicable y controlable, que se evaluó contra versiones sin adaptación.

**Cinco cosas para tener claras:**
1. Los precios son **reales** y se actualizan con un scraper que respeta `robots.txt`.
2. El recomendador es de **reglas**, no de aprendizaje automático, y eso es una decisión justificada (no hay datos históricos y la explicabilidad es un requisito).
3. Nunca se inventan precios: lo que no se puede valorizar se informa como "sin precio" con su motivo.
4. La evidencia de utilidad es una **simulación con precios reales**, no una medición con personas (el enunciado no la exige).
5. El staging usa **plan gratuito**: los servicios se duermen, y por eso hay que despertarlos antes de la demo.

## 2. Mapa del sistema y recorridos

```
   Usuario (navegador / PWA / Android)
        |
        v
   Frontend (nginx + Angular)  --/api/-->  Backend NestJS  <---->  PostgreSQL
                                                |
                                                |  HTTP + clave de servicio (X-Service-Key)
                                                v
                                         Servicio Python (FastAPI)
                                                |
                                                v
                                    Jumbo.cl y SantaIsabel.cl (scraping)
```

| Componente | Tecnología | Responsabilidad | Quién puede llamarlo |
|---|---|---|---|
| Frontend | Angular 22 + Ionic 9, sin zone.js, signals | Interfaz, PWA, sin conexión | El usuario |
| Backend | NestJS 11 + TypeORM | API, auth, reglas, persistencia, orquestación | El frontend |
| Servicio Python | FastAPI + Pydantic | Scraping, validación, normalización | **Solo el backend** |
| Base de datos | PostgreSQL 16 | Datos y migraciones | **Solo el backend** |

**Recorrido 1: de un precio en la tienda hasta la pantalla.**
`POST /api/prices/refresh` (responde 202) crea una ejecución por tienda y sigue en segundo plano. NestJS pide a Python lotes de consultas (31 términos del catálogo). Python respeta `robots.txt`, hace una solicitud por segundo, lee el JSON-LD de la búsqueda de la tienda y valida cada producto. NestJS vuelve a validar el contrato, deduplica y hace `upsert` en `productos` y `precios_supermercado`. El comparador (`GET /api/prices/compare`) lee el último precio de cada producto.

**Recorrido 2: del plan semanal a la lista con costo.**
El usuario guarda comidas con ingredientes (`POST /api/meals`). Con `POST /api/shopping-lists/generate` NestJS junta los ingredientes de la semana y los manda a Python (`/ingredients/normalize`): limpia nombres, los mapea a un término del catálogo, convierte unidades a kg, l o un y suma las líneas repetidas. NestJS guarda la lista y, al consultarla (`GET /api/shopping-lists`), calcula el costo en cada tienda con los precios vigentes.

**Recorrido 3: sugerencias.**
`GET /api/recommendations` toma las 25 recetas, calcula costo por porción con precios reales y cuánto reutiliza de lo que ya está en el plan, y las ordena con `puntaje = pesoCosto x costo + (1 - pesoCosto) x reutilización`. Cada sugerencia trae su explicación. El usuario puede aceptar (la receta pasa al plan), rechazar (deja de mostrarse), restablecer, ajustar el peso, excluir ingredientes o desactivar la adaptación.

## 3. Qué se evalúa

**Presentación y demostración** (sección 24 del enunciado). La demo debe mostrar: (1) recuperación automatizada de información real, (2) validación y preparación de datos, (3) procesamiento en FastAPI, (4) comunicación NestJS-FastAPI, (5) persistencia, (6) consulta y visualización en el frontend, (7) ejecución del pipeline DevSecOps, (8) acceso al staging, (9) una métrica de evaluación, (10) manejo de un error o indisponibilidad. En la sección 25 está cómo cubrir cada una.

**Defensa técnica individual** (10 % de la nota final). Cuatro criterios de 25 % cada uno:

| Criterio | Qué hay que lograr | Cómo prepararse |
|---|---|---|
| Aporte personal | Explicar qué componentes desarrollaste, qué tareas hiciste y en qué decisiones participaste, con evidencia verificable en el repositorio | Sección 4 de esta guía y [registro-participacion.md](registro-participacion.md) |
| Dominio técnico | Entender cómo funciona lo que está en el repositorio | Parte B |
| Respuesta a preguntas | Responder con precisión y con tus palabras | Sección 26 |
| Limitaciones y mejoras | Reconocer ventajas, límites y mejoras posibles | Sección 24 |

El enunciado lista los temas que pueden preguntarse: problema, arquitectura, componentes, flujo de datos, modelo de base de datos, API REST, autenticación y autorización, estrategia de ramas, pipeline DevSecOps, GitHub Actions, variables y secretos, Docker, Terraform, pruebas, seguridad, recuperación web, capacidad adaptativa, observabilidad, métricas, privacidad, accesibilidad y limitaciones. **La Parte B cubre cada uno.**

## 4. Participación, autoría e inteligencia artificial

Esta sección existe para que la respuesta sobre "quién hizo qué" sea **verdadera, igual en los dos y verificable**. El enunciado dice que el repositorio debe evidenciar colaboración y responsabilidades trazables, y que incluir código que el equipo no pueda explicar afecta la nota. Por eso la estrategia es **decir lo que pasó** y **poder explicar todo el código**.

### Los hechos que muestra el repositorio

Datos al 22-11-2026 (comando: `git log --no-merges --format='%an|%ad' --date=short`):

| Autor en git | Commits | Cuándo |
|---|---|---|
| Jan | 79 | 25-28 de septiembre (EP1) y 21-22 de noviembre |
| Camila Torres | 24 | 26-28 de septiembre (EP1), sobre todo frontend (19 de 24 tocan `frontend/`) |

- Total: 103 commits sin contar uniones. Hay **dos períodos de actividad**: septiembre (EP1, 49 commits entre el 25 y el 28) y noviembre (EP2 y Entrega Final, 54 commits, de los cuales 51 son del 22 de noviembre).
- Existe un solo tag, `v1.0.0-ep1` (EP1). Los tags de la EP2 y de la Entrega Final se crean al cerrar la entrega. Las PR #19 a #22 llevaron la EP2 y la EF a `develop` y a `main`.

### Lo que declaran Jan y Camila (a confirmar por ambos antes de la defensa)

1. **Cuenta de git compartida.** Camila tuvo problemas con su equipo anterior y se integró a este proyecto; parte del trabajo se subió desde la cuenta de Jan. Esto **no se puede verificar desde git**, por eso se declara en [registro-participacion.md](registro-participacion.md).
2. **Validación.** Camila revisó y validó el trabajo de esta etapa. (Si hay comentarios en las PR de GitHub o conversaciones que lo respalden, conviene enlazarlas.)
3. **Uso de IA.** El desarrollo de la EP2 y la Entrega Final se hizo con **Claude (Anthropic)**, un asistente de IA, bajo la dirección de Jan: Jan decidió alcance y prioridades y revisó los cambios; el asistente escribió y modificó código, pruebas y documentación y ejecutó comprobaciones. Los commits salen con la identidad de Jan y sin línea de coautor, por lo que el conteo de commits **no distingue** lo escrito con asistencia. Por eso existe la sección de IA del registro.
4. **El período entre entregas.** La EP2 se entregó con retraso (estaba prevista para el 19 de octubre); por eso el desarrollo de esta etapa se concentra en noviembre. El enunciado considera insuficiente "realizar todos los commits inmediatamente antes de una entrega", así que **esto debe reconocerse con naturalidad si lo preguntan**, no esconderse.

> Pendiente de confirmar con la profesora: la política de uso de IA de la asignatura. Si prohíbe o limita algo de lo anterior, hay que decirlo ahora y no en la defensa.

### Cómo responder, sin inventar

**"¿Cuál fue tu aporte?"** Estructura: *qué hice* + *qué decidí* + *dónde está la evidencia* + *qué no hice yo y quién lo hizo*.

- **Jan** puede hablar de: definir el alcance y las prioridades; las decisiones de arquitectura (un solo dueño de la base, Python sin acceso a datos, reglas en vez de ML, Render y plan gratuito, clave de servicio); la operación del despliegue (crear la cuenta y las claves de Render, aplicar Terraform, configurar el environment `staging`, probar el deploy y el rollback); la revisión y aprobación de los cambios; y las pruebas que se hicieron. Debe poder explicar el backend, el servicio Python, el pipeline y la infraestructura.
- **Camila** puede hablar de: el frontend y la experiencia de usuario, el prototipo de Figma, el diseño de la interacción de la capacidad adaptativa (cómo se presenta la sugerencia y cómo se controla), y su revisión y validación del trabajo. Sus 24 commits de septiembre están en `frontend/`. Debe poder explicar el frontend completo (sección 11) y el flujo general.
- **Regla común:** no afirmar haber escrito algo que no se escribió, y **no decir "lo hizo la IA y no sé cómo funciona"**. La respuesta correcta es "se hizo con asistencia de IA bajo mi dirección; te explico cómo funciona" y explicarlo.

**Respuestas modelo**

1. *¿Por qué casi todos los commits salen con la cuenta de Jan?* "Camila participó en este proyecto usando la cuenta de Jan, porque tuvo problemas con su equipo anterior. Lo declaramos en el registro de participación. Sus 24 commits de septiembre sí están con su nombre."
2. *¿Por qué 51 commits en un día?* "La EP2 se entregó con retraso y el desarrollo de esta etapa se concentró en pocos días, con asistencia de IA. Los commits son pequeños y por tema, y está documentado en el registro."
3. *¿Usaron IA?* "Sí, Claude. Nosotros definimos el alcance y revisamos y probamos cada cambio. Todo está en el registro. Puedo explicar cualquier parte del código."
4. *¿Quién escribió esta función?* "Se escribió con asistencia de IA bajo mi dirección. Funciona así: ..." y se explica. Si no se sabe, se abre el archivo y se lee.

---

# Parte B. Componentes

## 5. Problema y objetivos

**Qué es.** Planificar comidas y compras consume tiempo y es desordenado. MenuSmart arma la lista de la semana, estima su costo en Jumbo y Santa Isabel y sugiere recetas baratas que reutilizan ingredientes.

**Archivos clave.** `README.md`, [`objetivos-e-indicadores.md`](objetivos-e-indicadores.md).

**Decisiones.** Tres objetivos medibles: reducir el costo de la compra semanal, reducir el desperdicio (proxy: ingredientes de un solo uso) y ahorrar tiempo. Cada uno tiene indicadores con fórmula, fuente y meta, y se distingue lo medido con simulación de lo que requeriría usuarios.

**Preguntas**

1. *¿Cómo sabes que la app reduce el gasto?* En simulación con precios reales, la canasta del menú adaptativo cuesta entre 25 % y 56 % menos que la aleatoria (y entre 27 % y 59 % menos que la alfabética). Es esperable porque el sistema optimiza costo; lo informativo es el efecto de la reutilización. Es una simulación, no una medición con personas.
2. *¿Cómo mides el desperdicio?* No se puede medir directamente. Usamos como indicador indirecto el porcentaje de ingredientes que se compran para una sola receta, que es lo que más probablemente sobra.
3. *¿Por qué dos supermercados?* Jumbo y Santa Isabel comparten plataforma y su `robots.txt` permite las páginas de búsqueda. Líder se descartó porque su `robots.txt` bloquea el catálogo (ADR-002).

## 6. Arquitectura

**Qué es.** Frontend Ionic/Angular, backend NestJS, servicio Python/FastAPI y PostgreSQL (diagrama en la sección 2).

**Archivos clave.** [`architecture.md`](architecture.md), [ADR-004](adr/004-arquitectura-y-justificacion.md), `docker-compose.yml`.

**Decisiones y por qué.**
- Un solo dueño de la base (NestJS): concentra autenticación, validación y migraciones.
- Python separado: el enunciado lo pide, y aísla el scraping (si cae, no tumba la API).
- Contrato validado en ambos lados (Pydantic en Python y un validador en NestJS), para que datos corruptos de la fuente externa no lleguen a la base.
- PostgreSQL: modelo relacional, `ON CONFLICT` y borrado en cascada.
- Recomendador de reglas: no hay datos históricos para entrenar (ADR-005).

**Preguntas**

1. *¿Por qué Python no escribe en la base?* Para que haya un solo dueño del esquema y dos barreras de validación antes de persistir.
2. *¿Qué pasa si cae el servicio Python?* NestJS responde 503 con un mensaje claro tras un reintento, `/health` pasa a `degraded`, los precios y las listas ya guardados siguen disponibles y el recomendador sigue funcionando, sin medir la reutilización.
3. *¿Qué riesgo tiene esta arquitectura?* NestJS es punto único de entrada; el contrato está duplicado en dos lenguajes; y en staging el servicio Python es público (plan gratuito) y se protege solo con una clave compartida.

## 7. Flujo de datos

**Qué es.** Dos flujos principales (precios y lista de compras); ver los recorridos 1 y 2 de la sección 2.

**Archivos clave.** `python-service/app/scrapers/service.py`, `backend/src/prices/prices.service.ts`, `backend/src/shopping-lists/shopping-lists.service.ts`, [`normalizacion-de-ingredientes.md`](normalizacion-de-ingredientes.md).

**Decisiones.** La actualización de precios corre en segundo plano (más de 30 segundos por tienda) y se consulta por `GET /api/prices/runs/:id`. Los lotes de 5 consultas se persisten en transacciones idempotentes. `POST /api/prices/refresh` responde 409 si ya hay una actualización en curso y 429 si hubo una exitosa hace menos de 10 minutos.

**Preguntas**

1. *Cuéntame el camino de un precio de la tienda a la pantalla.* Ver recorrido 1 de la sección 2.
2. *¿Cómo se pasa de "Tomates 500 g" a un costo?* Se normaliza (nombre limpio, término `tomate`, unidad kg), se suma con otras líneas del mismo término y se busca, en cada tienda, el producto relevante de menor precio por kg. Costo = precio por kg por cantidad.
3. *¿Por qué una ejecución en segundo plano?* Recorrer el catálogo a una solicitud por segundo toma más de 30 segundos por tienda; una petición síncrona sería frágil.

## 8. Modelo de datos

**Qué es.** Nueve tablas: `users`, `comidas`, `ingredientes`, `productos`, `precios_supermercado`, `ejecuciones_scraping`, `listas_compra`, `lista_compra_items` y `recomendacion_feedback`. Cinco migraciones escritas a mano.

**Archivos clave.** [`database.md`](database.md) (diagrama), `backend/src/**/entities/*.entity.ts`, `backend/src/migrations/`.

**Decisiones.**
- `productos.slug` único: el slug de la URL identifica el mismo producto en ambas tiendas.
- Un precio por producto, tienda y día (`IDX_precios_tienda_producto_dia`): cargas idempotentes.
- `ejecuciones_scraping` con contadores y errores: alimenta las métricas de calidad.
- Borrado en cascada desde `users`: derecho a borrar los datos.
- `reglas` y `nombresOriginales` en `jsonb`: trazabilidad de la normalización.
- `listas_compra` única por `(usuarioId, semana)`.

**Preguntas**

1. *¿Cómo evitas precios duplicados?* Con el índice único `(supermercado, productoId, fechaDia)` y `INSERT ... ON CONFLICT DO UPDATE`: repetir la actualización el mismo día sobrescribe.
2. *¿Cómo registras la procedencia?* Cada precio guarda tienda, fecha y hora, URL del producto, la consulta del catálogo y la ejecución que lo trajo.
3. *¿Cómo sabes que la base se reproduce solo con migraciones?* En desarrollo se usó `synchronize`, pero un job del CI crea una base vacía, corre todas las migraciones y `migration:generate --check` falla si hay cambios de entidades sin migración. Fue una observación de la EP1.

## 9. API REST

**Qué es.** **26 operaciones** en NestJS (bajo `/api`, más `/health`) y **4** en el servicio Python (`/health`, `/metrics`, `/ingredients/normalize`, `/scrape/search`). Documentadas con OpenAPI.

**Archivos clave.** `backend/src/*/*.controller.ts`, `backend/src/*/dto/`, [`docs/api/README.md`](api/README.md), `docs/api/openapi.json`.

**Grupos de endpoints (NestJS):** auth (registro, login), meals (CRUD del plan), shopping-lists (generar, leer, marcar comprado), prices (catálogo, refresh, runs, compare, quality), recommendations (recomendar, aceptar, rechazar, restablecer), ingredients (normalizar), users (`GET` y `DELETE /users/me`), observabilidad (`/health`, `/api/metrics`).

**Decisiones.** `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`; DTOs con `class-validator`; códigos explícitos (201, 202, 204, 400, 401, 403, 404, 409, 429, 503); los recursos del usuario se filtran por el id del token.

**Preguntas**

1. *¿Cómo está documentada la API?* Con `@nestjs/swagger`: Swagger UI en `/api/docs` y la especificación exportada en `docs/api/openapi.json` (se generó desde la aplicación corriendo, no a mano). FastAPI publica la suya en `/docs`. Las respuestas aparecen tipadas como `object` (limitación).
2. *¿Por qué 409 y 429 en `refresh`?* 409 evita dos actualizaciones simultáneas; 429 protege a las tiendas de abuso.
3. *¿Qué valida el backend de lo que entrega Python?* Cada producto contra el contrato (`parseScrapeResponse`); los inválidos se descartan y se cuentan, y una respuesta con forma inválida da 502.

## 10. Autenticación y autorización

**Qué es.** Registro e inicio de sesión que entregan un JWT. `JwtAuthGuard` protege todas las rutas salvo `/health`, `/api`, registro e inicio de sesión. Hay un solo rol: usuario autenticado.

**Archivos clave.** `backend/src/auth/` (servicio, estrategia JWT, DTOs, guard), `backend/src/common/current-user.decorator.ts`, `backend/src/users/`.

**Decisiones.**
- Contraseñas con **bcrypt de 12 rondas**; política de 8 a 72 caracteres con al menos una letra y un número.
- `JWT_SECRET` obligatorio (el backend no arranca sin él); expiración configurable (por defecto 1 hora).
- El id del usuario sale del token, nunca del cuerpo ni de la URL.
- Límites de solicitudes por IP con `@nestjs/throttler` (por defecto 300 por minuto en general, 10 en login, 5 en registro y 5 en actualizar precios; configurables con `RATE_LIMIT_*`).
- Un login contra un correo inexistente compara contra un hash señuelo, para no filtrar por tiempo si la cuenta existe.
- `DELETE /api/users/me` exige la contraseña en el cuerpo y borra la cuenta y todo lo suyo en cascada.

**Preguntas**

1. *¿Cómo evitas que un usuario vea datos de otro?* Todas las consultas de comidas, listas y feedback filtran por el `usuarioId` del token; si el recurso es de otro, responde 404. Hay pruebas e2e con dos usuarios.
2. *¿Dónde se guarda el token?* En `localStorage` del navegador; el backend no lo guarda. Es una limitación: un XSS podría robarlo (una cookie `HttpOnly` sería mejor).
3. *¿Qué falta?* Roles (cualquier usuario autenticado puede disparar la actualización de precios), recuperación de contraseña, verificación de correo y revocación de tokens.

## 11. Frontend (Angular, Ionic, PWA y Android)

**Qué es.** Aplicación **Angular 22 con Ionic 9**, organizada en módulos, **sin zone.js** (usa **signals** y `inject()`), que se sirve con nginx. Es una **PWA** instalable con modo sin conexión, y tiene un proyecto **Android** con **Capacitor 8**.

**Archivos clave.**
- `frontend/src/app/tabs/`: las pantallas: `plan-semanal` (con `agregar-comida`, `detalle-comida` y `sugerencias`), `lista-compras`, `comparador`, `perfil` y la barra lateral.
- `frontend/src/app/core/services/`: `auth`, `plan-semanal`, `lista-compras`, `comparador`, `recomendaciones`, `conectividad`, `layout`.
- `frontend/src/app/core/guards/auth.guard.ts` y `core/interceptors/auth.interceptor.ts`.
- `frontend/src/environments/`: `environment.ts` (desarrollo), `environment.prod.ts` (usa `/api` relativo) y `environment.android.ts` (URL absoluta del backend).
- `frontend/ngsw-config.json`, `frontend/src/manifest.webmanifest` (PWA), `frontend/nginx.conf.template` (proxy a la API), `frontend/capacitor.config.ts` y `frontend/android/`.

**Decisiones.**
- **Dos estructuras, mobile y desktop**: el corte es 1024 px (`LayoutService`). Por debajo se renderizan pestañas abajo y tarjetas; por encima, barra lateral y columnas. Son dos árboles de componentes, no el mismo HTML estirado con CSS.
- **El guard y el interceptor**: `authGuard` redirige a login si no hay sesión; el interceptor agrega `Authorization: Bearer` y, si la API responde 401, cierra la sesión.
- **Estado con signals**: cada servicio expone señales con datos, estado de carga y error.
- **Sin conexión**: el service worker guarda en caché la aplicación (HTML, JS, CSS, imágenes y fuentes) y la **comparación de precios** (`/api/prices/compare`, estrategia `freshness`: intenta la red hasta 5 segundos y, si falla, usa la última copia, de hasta 7 días). No se guardan en caché la autenticación ni los datos personales (plan y listas). `conectividad.service.ts` muestra un aviso accesible cuando no hay red.
- **Proxy `/api/` en nginx**: así el navegador habla con el mismo origen y no hay problemas de CORS. En Android, como no existe ese proxy, se usa una configuración de build con la URL absoluta del backend.
- **Accesibilidad**: se auditó con axe-core en 9 pantallas y 2 formatos (escritorio y móvil), con 0 infracciones en la última corrida.
- Pruebas con **Vitest** (109 pruebas).

**Preguntas**

1. *¿Por qué no usan zone.js?* Angular permite detección de cambios basada en signals; es más simple y rápida, y cada servicio expone el estado como señales. Es una decisión de arquitectura del frontend.
2. *¿Cómo funciona el modo sin conexión?* El service worker (`@angular/service-worker`, configurado en `ngsw-config.json`) cachea la aplicación y la comparación de precios; sin red se ve la interfaz y los últimos precios. El plan y las listas necesitan conexión, porque son datos personales y no se guardan en caché. El servicio de conectividad detecta el estado y muestra el aviso.
3. *¿Se probó el APK?* El CI lo compila (workflow `Android`), pero no se probó en un dispositivo. La limitación está declarada.

## 12. Obtención de información web (scraping)

**Qué es.** El servicio Python lee el bloque **JSON-LD** (`ItemList`) de la búsqueda de Jumbo y Santa Isabel para **31 términos** del catálogo.

**Archivos clave.** `python-service/app/scrapers/` (`service.py`, `parser.py`, `normalizer.py`, `robots.py`, `stores.py`, `schemas.py`, `config.py`), [ADR-002](adr/002-fuentes-datos-web.md), [ADR-003](adr/003-metodo-scraping.md), [`calidad-de-datos.md`](calidad-de-datos.md).

**Decisiones.**
- Se prefirió el JSON-LD (datos estructurados que la propia tienda publica) a parsear HTML o CSS, que se rompen con cualquier cambio visual.
- Intérprete propio de `robots.txt` con comodines (el de la biblioteca estándar no los soporta).
- Una solicitud por segundo, timeout de 10 s, 2 reintentos con espera creciente, sin reintentar ante 403 o 429.
- Redirecciones solo dentro del dominio y respuesta máxima de 5 MB.
- Validación de cada registro y deduplicación por slug.
- Se identifica con un User-Agent propio.

**Preguntas**

1. *¿Es legal hacer scraping?* Se respeta `robots.txt`, se limita la carga y se leen solo datos públicos. Los términos de servicio no se analizaron jurídicamente y el uso es académico y de bajo volumen. Es una limitación declarada.
2. *¿Qué pasa si la tienda cambia su HTML?* La consulta falla con el error `estructura`, no se guardan datos nuevos y los precios anteriores siguen disponibles con su fecha.
3. *¿Cómo sabes que los datos son buenos?* `GET /api/prices/quality`: registros válidos, duplicados y descartados, tasa de errores y cobertura de los 31 términos. En las últimas corridas, cerca de 99 % (Jumbo) y 96 % (Santa Isabel) de registros válidos y cobertura de 31 de 31. "Válido" es validez de formato, no de relevancia.

## 13. Procesamiento Python: normalización de ingredientes

**Qué es.** `POST /ingredients/normalize` toma lo que escribe el usuario ("Arroz ", 200 g, "arroz", 300 G) y devuelve ingredientes comparables y sumados ("arroz", 0,5 kg).

**Archivos clave.** `python-service/app/normalizacion.py`, `python-service/app/normalizacion_datos.py` (unidades, equivalencias y sinónimos), [`normalizacion-de-ingredientes.md`](normalizacion-de-ingredientes.md).

**Las reglas, en orden:**
1. **Limpiar** el nombre (minúsculas, sin tildes, sin adjetivos descriptivos).
2. **Mapear a un término del catálogo**: por nombre exacto, por singular o por contención ("tomates cherry" a `tomate`), usando sinónimos ("pasta de tomate" a `salsa de tomate`).
3. **Evitar errores léxicos** con palabras de exclusión: "leche condensada" no es `leche`; "harina de maíz" no es `harina`; "aceite de coco" no es `aceite`.
4. **Convertir unidades** a kg, l o un (g a kg, ml a l; las "unidades" a kg con un peso típico por pieza, por ejemplo una cebolla pesa unos 0,2 kg).
5. **Unir** las líneas del mismo término y sumar cantidades.
6. **Registrar las reglas aplicadas** en cada línea (`rules`, `original_names`, `merged_lines`), para poder explicar el resultado.

**Preguntas**

1. *¿Por qué reglas y no un modelo de lenguaje?* Es determinista, explicable y se puede probar; con un catálogo de 31 ingredientes un modelo no aporta y agrega costo y variabilidad.
2. *¿Qué error conocido tiene?* Es léxico: "aceite de oliva" se toma como `aceite`, y otros nombres compuestos pueden mapearse al término más cercano. Algunos casos se cubren con palabras de exclusión.
3. *¿Cómo alimenta la lista y la comparación?* Entrega cantidades en unidades comparables, que el backend usa para elegir el producto relevante de la misma unidad y calcular el costo por tienda.

**Cómo se calcula el costo de una lista (backend).** Por cada ítem y tienda se elige el producto más barato **de la misma unidad** que supera un filtro de relevancia (`relevancia.ts`: excluye, por ejemplo, alimentos para bebé o puré cuando se pidió tomate). Los totales por tienda **solo suman los ítems con precio en ambas tiendas** (comparación justa). Lo que no se puede valorizar se informa con su motivo (`sin_termino`, `sin_precio_en_tienda`, `unidad_no_comparable`). **Nunca se inventan precios.**

## 14. Capacidad adaptativa

**Qué es.** Un recomendador de recetas por **costo por porción** y **reutilización de ingredientes**, con explicación y controles del usuario. Es de reglas y puntaje.

**Archivos clave.** `backend/src/recommendations/` (`scoring.ts`, `recommendations.service.ts`, `recetas.ts`), [`capacidad-adaptativa.md`](capacidad-adaptativa.md), [ADR-005](adr/005-recomendador-adaptativo.md), [`evaluacion-recomendador.md`](evaluacion-recomendador.md), `backend/scripts/evaluar-recomendador.ts`.

**Las 9 preguntas del enunciado, en corto** (detalle en `capacidad-adaptativa.md`):
1. *Qué se adapta:* el orden y la selección de las recetas sugeridas.
2. *A qué:* a los precios vigentes y a lo que ya está en el plan de la semana.
3. *Con qué mecanismo:* `puntaje = pesoCosto x costoNormalizado + (1 - pesoCosto) x reutilización`, con pesos 60/40 por defecto.
4. *Qué decide el sistema y qué decide la persona:* el sistema propone y explica; la persona acepta, rechaza, ajusta el peso, excluye ingredientes, restablece o desactiva la adaptación.
5. *Cómo se explica:* cada sugerencia indica su costo por porción y qué ingredientes reutiliza.
6. *Cómo se evalúa:* simulación reproducible (semilla fija) contra una base alfabética y una aleatoria promediada en 1000 repeticiones, con precios reales.
7. *Qué sesgos tiene:* favorece platos baratos (legumbres, papas, huevos) y puede repetir platos; no considera restricciones alimentarias.
8. *Qué datos personales usa:* solo si aceptó o rechazó una receta (`recomendacion_feedback`).
9. *Qué pasa sin precios:* las recetas sin precios suficientes van al final con un aviso.

**Preguntas**

1. *Explica la fórmula.* El costo se normaliza entre la receta más barata y la más cara del conjunto; la reutilización es la fracción de ingredientes de la receta que ya están en el plan; el puntaje mezcla ambas con el peso del costo.
2. *¿Por qué no aprendizaje automático?* No hay historial de uso; un modelo entrenado con datos sintéticos no demostraría nada sobre el problema real, y las reglas son transparentes y evaluables contra una base. El enunciado no obliga a usar IA generativa.
3. *¿Qué demuestra la evaluación?* Que la adaptación hace lo que promete sobre los datos: con reutilización el menú compra menos ingredientes distintos y baja el porcentaje de ingredientes de un solo uso, a cambio de una canasta algo más cara que optimizando solo el costo. **No** demuestra que a las personas les guste: eso requeriría una prueba con usuarios.

## 15. Pruebas

**Qué es.** Unitarias en los tres componentes, e2e del backend contra PostgreSQL real, integración NestJS-Python con el servicio real en CI, y pruebas de recuperación ante fallas.

**Cifras (22-11-2026):** **527 pruebas**: backend 257 (201 unitarias y 56 e2e), Python 161 y frontend 109. Además, 9 pruebas de integración NestJS-FastAPI con el servicio Python real. Cobertura: backend 97,8 % de sentencias y 81,4 % de ramas, Python 96 %, frontend 58 %. El CI exige mínimos (backend 90 % de sentencias y 70 % de ramas, Python 90 %).

**Archivos clave.** `backend/src/**/*.spec.ts`, `backend/test/*.e2e-spec.ts`, `backend/test/python-real.integration-spec.ts`, `python-service/tests/`, `frontend/src/**/*.spec.ts`, [`plan-de-pruebas.md`](plan-de-pruebas.md).

**Decisiones.** Las pruebas del scraper usan páginas congeladas (fixtures) para no depender de internet: el parser y el contrato son los reales. Las funciones puras (costo, puntaje, calidad, normalización) se prueban sin base de datos. La integración arranca el servicio Python real, **con clave de servicio**, y prueba que sin la clave responde 401.

**Preguntas**

1. *¿Cómo pruebas el scraper sin consultar las tiendas?* Con HTML capturado y un cliente HTTP simulado; las pruebas detectan cambios en el parser, no cambios en el sitio real.
2. *¿Qué pruebas muestran resiliencia?* Timeout con reintentos, error 503 que se recupera, bloqueo 429 sin reintento, página sin estructura, robots no disponible, caída parcial, y el e2e "si Python no responde, los datos anteriores siguen disponibles".
3. *¿Qué no se prueba?* No hay pruebas de carga ni de interfaz de punta a punta con navegador; la accesibilidad se midió con axe, no con lector de pantalla.

## 16. Seguridad

**Qué es.** Controles de autenticación, validación, límites, secretos y dependencias. Documento completo: [`seguridad-privacidad-etica.md`](seguridad-privacidad-etica.md).

**Archivos clave.** `backend/src/setup-app.ts` (helmet y validación), `backend/src/auth/`, `backend/src/rate-limit.ts`, `python-service/app/seguridad.py`, `.gitleaks.toml`, `.trivyignore`, `.gitleaksignore`, workflows.

**Decisiones.**
- Validación estricta con whitelist; consultas SQL parametrizadas (incluido el SQL manual de `prices.sql.ts`).
- `helmet` (cabeceras), límite de solicitudes por IP, redacción de contraseñas y tokens en los logs.
- Secretos fuera del repositorio; **gitleaks** revisa todo el historial en cada push; **Trivy** escanea las imágenes; `npm audit --audit-level=high` y `pip-audit`.
- **Clave de servicio entre NestJS y Python** (`X-Service-Key`): como el plan gratuito de Render no ofrece servicios privados, Python es público, y por eso exige una clave compartida salvo en `/health`. Se compara en tiempo constante y no se escribe en los logs. El frontend nunca llama a Python.

**Preguntas**

1. *¿Cómo evitas inyección SQL?* TypeORM parametriza y el SQL manual usa solo parámetros posicionales, sin concatenar texto.
2. *¿Cómo evitas fugas de secretos?* `.env` fuera de git, gitleaks en CI, secretos de Render como variables `sensitive` de Terraform y fuera del repositorio, y redacción en los logs. Si gitleaks detecta algo falso positivo, se registra por huella en `.gitleaksignore`, como pasó con claves de prueba.
3. *¿Qué riesgos quedan?* CORS abierto, token en `localStorage`, sin roles ni recuperación de contraseña, límites en memoria, servicio Python expuesto en staging protegido solo por una clave compartida (sin rotación), y términos de servicio de las tiendas sin análisis jurídico.

## 17. Observabilidad

**Qué es.** `/health` que verifica la base y el servicio Python; logs JSON con identificador de solicitud que viaja de NestJS a Python; métricas de tiempo de respuesta por ruta (`/api/metrics` y `/metrics` en Python); errores de la fuente externa registrados.

**Archivos clave.** `backend/src/health/health.controller.ts`, `backend/src/observability/` (contexto de solicitud con `AsyncLocalStorage`, logger estructurado, métricas, middleware), `python-service/app/observability.py`.

**Decisiones.** `X-Request-ID` permite seguir una petición por los dos servicios; los logs redactan secretos; las métricas viven en memoria (simples, sin infraestructura extra) y reportan p50 y p95.

**Preguntas**

1. *¿Cómo sigues una petición entre NestJS y Python?* Con el identificador que NestJS genera y propaga en la cabecera; aparece en los logs de ambos.
2. *¿Qué indica `/health`?* `ok` si la base y Python responden; `degraded` si alguno falla (HTTP 200 con el detalle por dependencia). El pipeline exige `ok`.
3. *¿Qué limitaciones tiene?* Las métricas se reinician con el proceso, no hay almacenamiento persistente ni alertas automáticas.

## 18. Métricas

**Qué es.** Tres familias: **calidad de datos** (`GET /api/prices/quality`), **evaluación del recomendador** (`npm run evaluar:recomendador`) y **rendimiento** (`/api/metrics`).

**Archivos clave.** `backend/src/prices/calidad.ts`, `backend/scripts/evaluar-recomendador.ts`, `backend/scripts/medir-latencia.mjs`, [`calidad-de-datos.md`](calidad-de-datos.md), [`objetivos-e-indicadores.md`](objetivos-e-indicadores.md).

**Decisiones.** Los porcentajes de calidad se calculan sobre las últimas 10 ejecuciones por tienda; la evaluación usa semilla fija para ser reproducible; "ingrediente de un solo uso" es un proxy declarado de desperdicio. Latencias medidas en local: comparación de precios, mediana de unos 156 ms; recomendaciones, unos 357 ms.

**Preguntas**

1. *¿Qué mide `porcentajeValidos`?* Registros que pasaron la validación sobre los extraídos; no mide si el producto es el adecuado.
2. *¿Qué significa que la canasta adaptativa sea 25 % a 56 % más barata?* En una simulación con precios reales, frente a una versión aleatoria; es esperable porque el sistema optimiza costo.
3. *¿Qué métrica falta?* Las de usuarios: aceptación real, utilidad percibida, comprensión y tiempo ahorrado. El enunciado las menciona como posibles, no como obligatorias, y la evaluación considera evidencia cuantitativa o cualitativa.

## 19. Estrategia de ramas y trabajo colaborativo

**Qué es.** Ramas por funcionalidad (`feature/...`) unidas por pull request a `develop`; `main` recibe las entregas con tag. En la EP2 y la EF se trabajó por temas (`feature/core-domain`, `feature/observability`, `feature/seguridad`, `feature/ci-auditoria`, `feature/pipeline-staging`, `feature/pwa-android`, `feature/docs-ep2`), integrados en `integration/ep2-ef`, que se unió a `develop` en la **PR #19**. Después: **#20** (staging en plan gratuito), **#21** (`develop` a `main`) y **#22** (documentación).

**Archivos clave.** [`registro-participacion.md`](registro-participacion.md), `git log --all --graph --oneline`.

**Decisiones.** Una rama por tema evita mezclar cambios y permite revisarlos por separado; **Conventional Commits** en español; merge commit para conservar el historial.

**Preguntas**

1. *¿Por qué ramas separadas por tema?* Cada una toca archivos distintos y se puede revisar y probar sola; la rama de integración comprobó que conviven y que el CI pasa en conjunto.
2. *¿Cómo se protege `main`?* Se exige pasar por pull request y por el CI (esto se configura en GitHub; si aún no está activo, se declara como pendiente).
3. *¿Qué muestra tu aporte en git?* Ver la sección 4: los commits por autor, las PR y los documentos, **con la salvedad de la cuenta compartida y la asistencia de IA**.

## 20. Pipeline CI/CD (GitHub Actions)

**Qué es.** `ci.yml` tiene **9 jobs**: backend, migraciones, frontend, python-service, secrets-scan (gitleaks), integracion-python, terraform, docker-images (con Trivy) y deploy-staging. Hay además dos workflows manuales o aparte: **Rollback de staging** y **Android** (compila el APK).

**Archivos clave.** `.github/workflows/ci.yml`, `rollback-staging.yml`, `android.yml`, `.github/scripts/`, [`pipeline-y-staging.md`](pipeline-y-staging.md), [`migraciones-y-auditoria.md`](migraciones-y-auditoria.md).

**Decisiones (quality gate).** `docker-images` y `deploy-staging` dependen de todos los demás jobs: una prueba fallida, una vulnerabilidad alta o un secreto detectado impiden construir y desplegar. El despliegue se hace por **SHA exacto**, no "lo último". Los secretos van en GitHub Secrets y la configuración no sensible en Variables, dentro del environment `staging`. `deploy-staging` corre solo en push a `develop`, con health checks y reintentos.

**Preguntas**

1. *¿Qué pasa si una dependencia tiene una vulnerabilidad alta?* El job de auditoría falla (el umbral es `high`; antes era `critical`, observación de la EP1), por lo que no se construyen imágenes ni se despliega.
2. *¿Cómo se prueba el rollback?* El workflow "Rollback de staging" recibe un SHA y un alcance (`todos`, `solo-backend`, `solo-frontend` o `solo-python`), redespliega ese commit y corre los health checks. Se probó una vez con `solo-frontend`: terminó en 33 segundos. No revierte migraciones de base de datos.
3. *¿Qué se vio en el CI de esta etapa?* Fallos reales que se corrigieron: un test que dependía de precios en la base, un job que no instalaba `pytest`, vulnerabilidades de `zlib1g` y `libxml2` en las imágenes base (se arreglaron actualizando los paquetes) y falsos positivos de gitleaks. Cierre: 24 checks en verde.

## 21. Docker

**Qué es.** Un `Dockerfile` por componente y `docker-compose.yml` con los cuatro servicios, healthchecks y orden de arranque.

**Archivos clave.** `backend/Dockerfile` (multi-etapa, imagen final `node:24-slim`, `USER node`), `frontend/Dockerfile` (compila y sirve con nginx), `python-service/Dockerfile` (`USER app`), `docker-compose.yml`, `.dockerignore`.

**Decisiones.** Multi-etapa para que la imagen final no lleve herramientas de compilación; el backend y Python corren **sin root**; se ejecuta `apt-get upgrade` / `apk upgrade` al construir para recibir correcciones de seguridad de las imágenes base; el backend corre con `NODE_ENV=production` (migraciones al arrancar, sin `synchronize`).

**Preguntas**

1. *¿Cómo se levanta todo?* Copiar `.env.example` a `.env`, completar y `docker compose up --build`; los servicios esperan a que la base y Python estén sanos.
2. *¿Cómo se escanean las imágenes?* Con Trivy en el CI (severidad `CRITICAL` y `HIGH`), con excepciones documentadas en `.trivyignore`.
3. *¿Qué falta en las imágenes?* El frontend corre con la imagen estándar de nginx, que arranca como root (los procesos de trabajo no). Sería una mejora de endurecimiento.

## 22. Terraform y staging en Render

**Qué es.** `infra/` define en el proveedor Render: una base `render_postgres` y tres `render_web_service` (Python, backend y frontend), en **plan gratuito** por defecto (variable `instance_plan`, que admite `starter`).

**Archivos clave.** `infra/services.tf`, `infra/database.tf`, `infra/variables.tf`, `infra/outputs.tf`, `infra/terraform.tfvars.example`, [ADR-001](adr/001-infraestructura-render.md).

**Decisiones.**
- Render por soportar contenedores Docker y plan gratuito.
- Como el plan gratuito no tiene servicios privados, **Python es público pero exige la clave `X-Service-Key`** (riesgo aceptado y documentado en el ADR-001).
- `auto_deploy = false`: el único camino a staging es el pipeline, después de pasar las pruebas.
- Variables sensibles (`jwt_secret`, `python_service_key`, clave de Render) con `sensitive` y en `terraform.tfvars`, que está en `.gitignore`. El CI solo valida (`fmt`, `validate`) y nunca aplica.
- La base de datos tiene la lista de IP permitidas vacía: solo la alcanzan los servicios de Render.

**Preguntas**

1. *¿Está desplegado?* Sí: el 22-11-2026 se ejecutó `terraform apply` (4 recursos), el pipeline desplegó `develop` y los health checks quedaron en verde. El backend responde `ok` con la base de datos y Python.
2. *¿Cómo llegan los secretos a Render?* Terraform los pasa como variables de entorno del servicio, tomándolos de `terraform.tfvars` local; no pasan por el repositorio. En GitHub solo está la clave de Render como secret del environment `staging`.
3. *¿Qué limitaciones tiene el plan gratuito?* Los servicios se duermen tras 15 minutos sin tráfico y la primera visita tarda cerca de un minuto; la base de datos gratuita caduca a los 30 días; el servicio Python es público. Con un plan de pago se vuelve a servicio privado.

## 23. Privacidad, ética y accesibilidad

**Qué es.** Datos personales mínimos (correo, nombre, hash de la contraseña, comidas y listas); borrado de cuenta en cascada; sin cookies ni analítica. Accesibilidad verificada con axe-core en las 9 pantallas, en escritorio y móvil.

**Archivos clave.** [`seguridad-privacidad-etica.md`](seguridad-privacidad-etica.md), [`accesibilidad.md`](accesibilidad.md), [`pwa-y-android.md`](pwa-y-android.md), [`capacidad-adaptativa.md`](capacidad-adaptativa.md) (sección 9).

**Decisiones.** El recomendador solo guarda aceptado o rechazado; los precios son públicos y no se asocian a usuarios; el scraping no envía datos del usuario. En accesibilidad se corrigieron contrastes, nombres accesibles de botones y casillas, íconos decorativos y el zoom del viewport.

**Preguntas**

1. *¿Qué datos personales guardas y cómo se borran?* Correo, nombre, hash de contraseña y lo que el usuario crea. `DELETE /api/users/me` (con la contraseña) borra la cuenta y todo lo suyo en cascada.
2. *¿Cómo garantizas accesibilidad?* No se puede afirmar una garantía: axe-core no encontró infracciones de contraste, nombres y roles en las 9 pantallas, pero no se hizo prueba con lector de pantalla ni Lighthouse.
3. *¿Qué riesgo de privacidad tiene el plan de comidas?* Puede revelar hábitos; solo lo ve su dueño y se borra con la cuenta.

## 24. Limitaciones del sistema (léelas bien: suman puntos)

**Lista corta para tener en la cabeza**

- **Evidencia de utilidad:** es una simulación con precios reales; no se midió con personas. El enunciado no lo exige, pero es la mejora más valiosa.
- **Staging gratuito:** servicios que se duermen, base que caduca a los 30 días y servicio Python público protegido por una clave compartida.
- **APK de Android:** el CI lo compila, pero no se probó en un dispositivo.
- **Actualización de precios manual:** no hay programación automática ni alertas; además, la fuente es frágil (depende del HTML de las tiendas) y sus términos de servicio no se analizaron jurídicamente.
- **Normalización léxica:** el mapeo compara palabras; el catálogo es de 31 ingredientes.
- **Estimación de costo aproximada:** el filtro de relevancia se basa en nombres y puede elegir productos poco representativos; sirve como orden de magnitud.
- **Recomendador de reglas:** 25 recetas, sin restricciones alimentarias ni nutrición, sin aprendizaje.
- **Seguridad:** sin roles, sin recuperación de contraseña, CORS abierto, token en `localStorage`, límites de solicitudes en memoria.
- **Perfil:** preferencias, supermercados favoritos y notificaciones son solo visuales.
- **Pruebas:** sin pruebas de carga ni de interfaz de punta a punta; cobertura del frontend de 58 %.
- **Repositorio:** historial concentrado en dos períodos y cuenta de git compartida (ver sección 4).

**Preguntas**

1. *¿Qué es lo más débil del proyecto?* Que la utilidad no se midió con personas y que el staging es gratuito y frágil. Ambos tienen plan: un protocolo de prueba con usuarios ya definido y pasar a instancias de pago.
2. *¿Qué mejorarías primero?* Medir con 5 a 10 usuarios, automatizar la actualización de precios y reforzar el filtro de relevancia de productos.
3. *¿Qué harías si el scraper deja de funcionar?* La app sigue con los últimos precios y su fecha; se detecta por el estado `fallido` o `parcial` de las ejecuciones y el error `estructura`; se corrige el parser y se actualizan las fixtures.

---

# Parte C. La presentación

## 25. Demostración en el staging: guion completo (10 minutos)

La demostración se hace **en el staging** (el enunciado pide ejecutarla ahí, no con capturas). Los comandos usan PowerShell y la dirección del staging. El plan de preparación de hoy y de mañana está en la sección 30.

### 25.1 Preparación (comprobar 30 minutos antes)

| Qué | Cómo comprobarlo |
|---|---|
| Servicios despiertos | Abrir https://menusmart-staging-backend.onrender.com/health: debe decir `"status":"ok"` con `database` y `pythonService` en `ok`. Abrir el sitio https://menusmart-staging-frontend.onrender.com y recorrer plan, lista y comparador. La primera visita puede tardar cerca de un minuto |
| Datos de la cuenta | La cuenta de Jan tiene 14 comidas en la semana del lunes 23 de noviembre (lista de 27 ingredientes, 4 comprados) y 8 recetas en la semana del 30 de noviembre. Quedan huecos libres para aceptar sugerencias en vivo |
| Precios | Cargados el 22-11 con cobertura de 31 de 31 en ambas tiendas. Siguen vigentes hasta 48 horas después |
| Token para la terminal (10 minutos antes; dura 1 hora) | Ver el bloque de abajo. No muestra la contraseña |
| Pestañas | La app; Swagger (`/api/docs`); GitHub Actions con el último run verde del workflow `CI` en `develop`; el repositorio; el panel de Render con los logs del backend y de Python; una terminal PowerShell con letra grande |
| Plan B local | `docker compose up -d --build` ya corriendo (`docker compose ps` con los 4 servicios en `healthy`), para el escenario 8 y por si el staging falla |
| Evitar | Mostrar contraseñas, el archivo `.env` o `infra/terraform.tfvars` |

**Token para la terminal (la contraseña se pide en una ventana y no se escribe en pantalla):**

```powershell
$B = "https://menusmart-staging-backend.onrender.com/api"
$cred = Get-Credential
$r = Invoke-RestMethod -Method Post "$B/auth/login" -ContentType "application/json" -Body (@{ email = $cred.UserName; password = $cred.GetNetworkCredential().Password } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($r.accessToken)" }
```

### 25.2 Línea de tiempo

| Minutos | Escenario | Qué se muestra |
|---|---|---|
| 0:00 a 0:45 | Contexto | Problema y arquitectura (diagrama del README) |
| 0:45 a 2:30 | 1. Funcionamiento normal | Plan, lista de compras y costo por tienda |
| 2:30 a 4:00 | 2. Capacidad adaptativa | Sugerencias, explicación, controles, arrepentimiento y comparación con la base |
| 4:00 a 5:00 | 3. Información web | Comparador, procedencia y calidad de datos |
| 5:00 a 6:00 | 4. Pipeline | GitHub Actions y rollback |
| 6:00 a 6:45 | 5. Pruebas | Ejecución y evidencia en CI |
| 6:45 a 7:30 | 6. Seguridad | Autenticación, validación, límites, clave de servicio, secretos |
| 7:30 a 8:30 | 7. Logs, métricas, salud | `/health`, `/api/metrics`, logs con `requestId` |
| 8:30 a 9:30 | 8. Degradación controlada | Servicio Python caído |
| 9:30 a 10:00 | Cierre | Limitaciones y qué sigue |

Orden de prioridad si falta tiempo: 1, 2, 3, 8 (el núcleo), luego 7, 6, 5 y 4. El enunciado pide los 10 puntos de la demostración, así que conviene abreviar los comandos antes que omitir un escenario.

### Contexto (0:00 a 0:45)

**Pantalla:** README en el diagrama de arquitectura.

**Decir:** "MenuSmart ayuda a planificar la semana y gastar menos. El problema: se compra sin lista, se repiten ingredientes que sobran y no se comparan tiendas. Tiene un frontend Angular con Ionic, un backend NestJS dueño de la base PostgreSQL y un servicio Python que normaliza ingredientes y obtiene precios de Jumbo y Santa Isabel, sin acceso a la base. Está desplegado en Render con Terraform; lo que van a ver corre en el staging."

### Escenario 1. Funcionamiento normal (0:45 a 2:30)

1. **Pantalla:** app, cuenta de Jan, pestaña **Plan semanal** (semana del 23 de noviembre). Mostrar las comidas planificadas.
2. **Hacer:** **Agregar comida**, escribir un ingrediente con texto libre (por ejemplo "tomates", 500, "g") y guardar.
3. **Pestaña Lista de compras:** regenerar la lista.
4. **Mostrar:** ingredientes sumados aunque estaban escritos distinto (el arroz de dos comidas queda en 0,5 kg), costo estimado en Jumbo y en Santa Isabel, cuál conviene (Jumbo, con un ahorro de unos $5.230) y los ítems sin precio, con su motivo.

**Decir:** "El servicio Python limpia y suma los ingredientes: 'Arroz 200 g' y 'arroz 300 g' quedan en una línea de 0,5 kg. El backend valoriza cada ítem con los precios vigentes y solo suma en el total los ítems con precio en ambas tiendas, para que la comparación sea justa. Los que no tienen precio lo dicen y explican por qué."

**Evidencia:** `docs/normalizacion-de-ingredientes.md`, `backend/src/shopping-lists/costo.ts`.

### Escenario 2. Capacidad adaptativa (2:30 a 4:00)

1. **Pantalla:** sugerencias del plan semanal.
2. **Mostrar:** sugerencias ordenadas, costo por porción, ingredientes que reutiliza del plan y la **explicación** de cada una.
3. **Aceptar** una sugerencia en un hueco libre y volver a pedirlas: las que comparten ingredientes con el plan suben.
4. **Arrepentirse:** borrar esa comida del plan. **Rechazar** una receta (deja de aparecer) y **restablecer los rechazos** (el estofado de cerdo y las hamburguesas ya están rechazados y vuelven).
5. **Cambiar la importancia del costo** y mostrar que el orden cambia. **Desactivar la adaptación** para volver al orden base.
6. **Comparar con la base desde la terminal:**

```powershell
Invoke-RestMethod "$B/recommendations?semana=2026-11-23&limite=3" -Headers $h | ConvertTo-Json -Depth 6
Invoke-RestMethod "$B/recommendations?semana=2026-11-23&limite=3&adaptativo=false" -Headers $h | ConvertTo-Json -Depth 6
```

**Decir:** "El recomendador es una política de reglas, no un modelo entrenado: puntaje = peso del costo por el costo normalizado, más el peso de la reutilización por la fracción de ingredientes que ya están en tu plan. No hay datos históricos para entrenar un modelo y así es explicable. La persona controla el peso, excluye ingredientes, rechaza o apaga la adaptación. Contra una versión sin adaptación, la simulación con precios reales dio una canasta entre 25 % y 56 % más barata. Es una simulación; no la medimos con personas."

**Evidencia:** `docs/capacidad-adaptativa.md`, `docs/evaluacion-recomendador.md`, `backend/src/recommendations/scoring.ts`.

### Escenario 3. Información web (4:00 a 5:00)

1. **Pantalla:** pestaña **Comparador**: mejor precio por ingrediente en cada tienda, productos idénticos, fecha de cada precio y aviso de desactualizado.
2. **Terminal (calidad de los datos):**

```powershell
Invoke-RestMethod "$B/prices/quality" -Headers $h | ConvertTo-Json -Depth 6
Invoke-RestMethod "$B/prices/runs?limite=2" -Headers $h | ConvertTo-Json -Depth 4
```

3. **Mostrar:** porcentaje de registros válidos, duplicados y descartados, cobertura del catálogo (31 de 31) y horas desde la última actualización.
4. **Opcional, si hay tiempo:** lanzar `POST $B/prices/refresh` (responde 202, corre en segundo plano y tarda cerca de un minuto por tienda) y mostrar el estado de la corrida en `GET $B/prices/runs`. Se permite una exitosa cada 10 minutos.

```powershell
Invoke-RestMethod -Method Post "$B/prices/refresh" -Headers $h
```

**Decir:** "Los precios salen del bloque JSON-LD de la búsqueda de cada tienda. El scraper respeta robots.txt, hace una solicitud por segundo y se identifica. Cada precio guarda tienda, fecha, URL y la ejecución que lo trajo. Hoy: cerca de 99 % y 96 % de registros válidos y 31 de 31 ingredientes con precio en ambas tiendas."

**Evidencia:** `docs/calidad-de-datos.md`, ADR-002 y ADR-003.

### Escenario 4. Pipeline de GitHub Actions (5:00 a 6:00)

1. **Pantalla:** pestaña Actions, último run del workflow `CI` en `develop`, en verde.
2. **Mostrar:** los 9 jobs (backend, migraciones, frontend, Python, integración NestJS y FastAPI, Terraform, detección de secretos, imágenes con Trivy y despliegue a staging) y que las imágenes y el despliegue dependen de que los anteriores pasen (quality gate).
3. Abrir el job `Backend` y mostrar lint, build, pruebas, cobertura y `npm audit --audit-level=high`.
4. Mostrar el job `Desplegar a staging y verificar salud` y sus health checks.
5. **Opcional (30 segundos, seguro):** ejecutar el workflow **Rollback de staging** con el SHA `614dba58aba555f309b1fac3b2960bb579a370ca` y `solo-frontend`: redespliega el frontend, que es idéntico, y verifica la salud.

**Decir:** "Cada push corre lint, pruebas, análisis de dependencias, detección de secretos, construcción y escaneo de imágenes y validación de Terraform. Solo si todo pasa, un push a develop despliega a staging y verifica la salud por SHA exacto. El umbral de `npm audit` es 'high'; antes era 'critical'. Hay un workflow de rollback por SHA."

**Evidencia:** `.github/workflows/ci.yml`, `docs/pipeline-y-staging.md`, `docs/migraciones-y-auditoria.md`.

### Escenario 5. Evidencia de pruebas (6:00 a 6:45)

```powershell
cd python-service; pytest -q                 # 161 pruebas, cerca de 1 segundo
cd ..\backend; npx jest                      # 201 pruebas unitarias
cd ..\frontend; npx ng test --watch=false    # 109 pruebas
```

**Decir:** "Hay pruebas unitarias en los tres componentes, e2e del backend contra una PostgreSQL real y una integración que en CI levanta el servicio Python real, con su clave de servicio, y ejecuta el cliente de NestJS contra él. Las partes sensibles tienen pruebas propias: contrato NestJS-FastAPI, normalización, recuperación ante fallas del scraper, costos y recomendador. En total son 527, con cobertura mínima exigida en el CI."

**Dato listo:** el log del CI con las pruebas e2e (no se corren en vivo porque necesitan base de datos).

### Escenario 6. Controles de seguridad (6:45 a 7:30)

1. **Sin token se rechaza:** `curl.exe -i https://menusmart-staging-backend.onrender.com/api/prices/compare` responde 401.
2. **Python exige su clave de servicio:** `curl.exe -i https://menusmart-staging-python.onrender.com/metrics` responde 401, y `.../health` responde 200.
3. **Validación estricta** (campos desconocidos y datos inválidos dan 400):

```powershell
try { Invoke-RestMethod -Method Post "$B/auth/login" -ContentType "application/json" -Body '{"email":"no-es-un-correo","campoExtra":1}' } catch { $_.Exception.Response.StatusCode.value__ }
```

4. **Límite de solicitudes** (al final del escenario; bloquea el login de esa IP por 1 minuto): repetir 11 veces un login incorrecto hasta recibir 429.

```powershell
1..11 | ForEach-Object { try { Invoke-RestMethod -Method Post "$B/auth/login" -ContentType "application/json" -Body '{"email":"a@a.cl","password":"incorrecta1"}' } catch { $_.Exception.Response.StatusCode.value__ } }
```

5. **Secretos:** mostrar `.env.example` (valores de ejemplo), que `.env` y `terraform.tfvars` están en `.gitignore`, y el job de gitleaks en CI.
6. **Privacidad:** `GET` y `DELETE /api/users/me`: la persona ve y borra sus datos (el borrado exige la contraseña). **No ejecutar el borrado con la cuenta de demo.**

**Decir:** "Contraseñas con bcrypt, JWT, validación con whitelist, consultas parametrizadas, límite de solicitudes por IP, detección de secretos en cada push y escaneo de imágenes. El servicio Python solo responde al backend: exige una clave de servicio compartida. Las limitaciones están documentadas: no hay roles ni recuperación de contraseña, y CORS está abierto."

**Evidencia:** `docs/seguridad-privacidad-etica.md`.

### Escenario 7. Registros, métricas y salud (7:30 a 8:30)

1. **Salud:** `curl.exe https://menusmart-staging-backend.onrender.com/health` (backend, base de datos y servicio Python).
2. **Métricas:**

```powershell
Invoke-RestMethod "$B/metrics" -Headers $h | ConvertTo-Json -Depth 6
```

   Mostrar tiempos por ruta (p50 y p95), errores 5xx y el resultado de las actualizaciones de precios.
3. **Logs:** en el panel de Render, pestaña Logs del backend: líneas JSON con `requestId`. Hacer una solicitud (por ejemplo generar la lista) y buscar el mismo `requestId` en los logs del servicio Python.

**Decir:** "Los logs son JSON con un identificador de solicitud que viaja del backend al servicio Python; así se sigue una petición de punta a punta. `/health` verifica la base y el servicio Python. Las métricas viven en memoria y se reinician con el proceso; no hay alertas automáticas."

### Escenario 8. Error o degradación controlada (8:30 a 9:30)

Se hace **en local con Docker Compose**, porque suspender y reanudar un servicio gratuito de Render tarda y es arriesgado. En el staging se muestra solo el `/health` como evidencia.

1. **Apagar Python:** `docker compose stop python-service`.
2. **Estado degradado:** `curl.exe http://localhost:3000/health` responde `"status":"degraded"` con `pythonService` en `error`.
3. **Lo que sigue funcionando:** el comparador y la lista ya generada, con precios guardados y su fecha; las sugerencias, sin medir la reutilización.
4. **Lo que falla con un error claro:** generar una lista nueva responde 503 ("El servicio de procesamiento de ingredientes no está disponible en este momento"); una actualización de precios deja la corrida en `fallido` y conserva los precios anteriores.
5. **Recuperar:** `docker compose start python-service` y mostrar que `/health` vuelve a `ok`.

**Decir:** "Cuando el servicio de procesamiento cae, NestJS no se cuelga: responde 503 con un mensaje claro, reintenta una vez solo ante falta de respuesta y lo ya guardado sigue disponible. Lo mismo pasa si una tienda cambia su página o bloquea al scraper: la consulta falla con un tipo de error y los precios anteriores se conservan."

**Evidencia:** `backend/test/prices.e2e-spec.ts` ("si el servicio Python no responde..."), `docs/calidad-de-datos.md`.

### Cierre (9:30 a 10:00)

**Decir:** "Lo que no está: la prueba del APK en un dispositivo, la evaluación con usuarios, la actualización automática de precios y un staging de pago, porque el actual es gratuito y se duerme. Está en las limitaciones del README. Lo siguiente es medir con 5 a 10 personas, automatizar la actualización de precios y pasar a instancias de pago."

### 25.3 Plan B

| Si falla | Qué hacer |
|---|---|
| **El staging tarda en responder** | Es el plan gratuito. Decirlo ("está despertando; en un plan de pago no pasa") y esperar |
| **El staging no responde** | Usar el entorno local con Docker Compose (app en `http://localhost:8080`, API en `http://localhost:3000`). Decirlo desde el primer minuto. Tener abierta la URL del último despliegue exitoso como evidencia secundaria |
| **La fuente externa (tiendas) no responde** | No hace falta: se usan los precios guardados. Si falla justo al lanzar la actualización, convertirlo en el escenario 8: mostrar el estado de la corrida y que los precios anteriores siguen disponibles |
| **No hay internet** | Todo corre en local salvo el scraping. Se pueden simular las tiendas con el servidor de integración (`uvicorn tests.servidor_integracion:app --port 8000` desde `python-service/`) |
| **GitHub no carga** | Mostrar `.github/workflows/ci.yml` en el editor y capturas de un run verde como respaldo, no como evidencia principal |
| **Una prueba falla en vivo** | Mostrar el log del último run verde del CI y explicar la causa si se conoce. No improvisar arreglos en pantalla |
| **El token expiró (1 hora)** | Repetir el bloque de login de la sección 25.1 |
| **Falla el recomendador o faltan precios** | Mostrar la explicación "no hay precios suficientes" (es el comportamiento diseñado) y la salida con `adaptativo=false` |
| **Error 429 al iniciar sesión** | Se alcanzó el límite de solicitudes (por ejemplo tras el escenario 6). Esperar 1 minuto |

## 26. Preguntas difíciles (practíquenlas al azar)

1. *¿Qué parte del código no entiendes bien?* Se responde con honestidad y con un plan: "esta parte, la normalización, la entiendo así... y los detalles los leería en `normalizacion.py`".
2. *¿Cómo sabes que el sistema funciona en producción?* Es staging, no producción. El pipeline despliega por SHA y verifica `/health` con `status: ok`; el flujo completo se probó en el staging real con una cuenta de prueba.
3. *¿Por qué el servicio Python es público en staging?* Porque el plan gratuito de Render no ofrece servicios privados. Se protegió con una clave compartida (`X-Service-Key`) y se documentó el riesgo en el ADR-001. Con un plan de pago vuelve a ser privado.
4. *¿Un usuario puede llamar directo a Python?* Solo con la clave. Sin ella responde 401 (salvo `/health`). El frontend nunca lo llama.
5. *¿Qué pasa si el usuario A pide la lista del usuario B?* Todas las consultas filtran por el id del token: devuelve 404.
6. *¿Qué pasa si dos usuarios actualizan precios a la vez?* La segunda recibe 409 mientras haya una en curso y 429 si hubo una exitosa hace menos de 10 minutos.
7. *¿Cómo evitas que el scraper sobrecargue las tiendas?* Una solicitud por segundo, `robots.txt` respetado, límite de reintentos, sin reintentar ante 429 y un mínimo de 10 minutos entre actualizaciones.
8. *¿Por qué es de reglas el recomendador y no IA?* No hay datos históricos, la explicabilidad es un requisito y el enunciado no obliga a IA generativa (ADR-005).
9. *¿Cuál es el sesgo del recomendador?* Favorece platos baratos y puede repetirlos; por eso el usuario puede bajar el peso del costo, excluir ingredientes, rechazar o desactivar la adaptación.
10. *¿Se probó con usuarios?* No. La evaluación es una simulación reproducible con precios reales, contra bases sin adaptación, más 527 pruebas automáticas y métricas de calidad y rendimiento. El enunciado admite evidencia cuantitativa o cualitativa. Queda como mejora y hay un protocolo definido.
11. *¿Por qué hay tantos commits en pocos días?* Ver la sección 4.
12. *¿Usaron IA?* Sí, Claude, bajo nuestra dirección, y está declarado en el registro.
13. *¿Qué harías distinto con más tiempo?* Medir con usuarios, automatizar la actualización de precios y reforzar el filtro de relevancia; pasar a instancias de pago para quitar la fragilidad del plan gratuito.
14. *¿Cómo se revierte un despliegue malo?* Con "Rollback de staging" (SHA y alcance) o desde el panel de Render; no revierte migraciones, que hay que revertir a mano.
15. *¿Qué hace Terraform y qué no hace el CI con Terraform?* Define la base y los tres servicios. El CI solo valida (`fmt` y `validate`); nunca aplica, porque no tiene credenciales de Render y aplicar infraestructura debe ser deliberado.

## 27. Cifras para memorizar

| Dato | Valor |
|---|---|
| Supermercados | 2 (Jumbo y Santa Isabel) |
| Términos del catálogo | 31 |
| Recetas | 25 |
| Tablas / migraciones | 9 / 5 |
| Operaciones de API | 26 (NestJS) y 4 (Python) |
| Pruebas automáticas | 527 (backend 257, Python 161, frontend 109) más 9 de integración |
| Cobertura | backend 97,8 % sentencias y 81,4 % ramas; Python 96 %; frontend 58 % |
| Jobs del CI | 9 (más rollback y Android) |
| Checks en la última PR | 24 en verde |
| Accesibilidad | axe: 9 pantallas x 2 formatos, 0 infracciones |
| Ahorro en la simulación | canasta adaptativa 25 % a 56 % menor que la aleatoria |
| Commits | 103 sin uniones: Jan 79, Camila 24 |
| PR de esta etapa | #19 (integración), #20 (staging gratuito), #21 (a `main`), #22 (docs) |
| Rollback probado | `solo-frontend`, 33 segundos |
| Staging | plan gratuito, base de datos caduca a los 30 días |

## 28. Glosario

- **ADR:** registro de una decisión de arquitectura (qué se decidió, alternativas y consecuencias).
- **Contrato:** la forma exacta de los datos entre dos servicios; aquí se valida en ambos lados.
- **DTO:** objeto que define y valida lo que entra y sale de un endpoint.
- **JSON-LD:** datos estructurados que una página publica para máquinas; de ahí leemos los precios.
- **Migración:** script versionado que crea o cambia el esquema de la base.
- **PWA:** aplicación web instalable que funciona parcialmente sin conexión.
- **Quality gate:** condición que impide desplegar si algo falla.
- **Rollback:** volver a un despliegue anterior.
- **Signal (Angular):** valor reactivo que notifica a la vista cuando cambia.
- **Staging:** ambiente de pruebas parecido a producción.
- **Upsert:** insertar o actualizar si ya existe (`ON CONFLICT DO UPDATE`).

## 29. Cómo repartirse el estudio sin quedar cortos

- **Los dos** deben saber: secciones 1 a 4, 5, 10, 15, 16, 24, 25 y 26. La defensa es individual: cualquier pregunta puede ir a cualquiera.
- **Camila** (frontend y experiencia de usuario): 11, 14, 23 y la demo en la app (sección 25).
- **Jan** (backend, Python, DevOps e infraestructura): 6, 7, 8, 9, 12, 13, 17, 18, 20, 21 y 22.
- **Ensayo cruzado:** cada uno le hace al otro 10 preguntas de las secciones del otro. Si una respuesta se queda corta, abrir el archivo indicado y leerlo.
- **No memorizar frases:** el enunciado dice que la defensa busca comprensión, no memorización.

---

# Parte D. Plan de práctica y entrega

## 30. Plan detallado para hoy y para mañana

### Esta noche (domingo 22 de noviembre)

| Hora aprox. | Qué | Quién | Resultado esperado |
|---|---|---|---|
| 0:00 a 0:30 | Leer en voz alta las secciones 1 a 4. Acordar la sección 4 (participación): qué dirá cada uno, con las mismas frases | Jan y Camila | Los dos cuentan la misma historia, verdadera |
| 0:30 a 2:00 | Estudio por componentes (reparto de la sección 29). Cada uno resume al otro lo suyo en 5 minutos | Cada uno | Cada uno puede explicar el frontend, el backend, Python y el pipeline a nivel general |
| 2:00 a 2:40 | Ensayo cruzado: 10 preguntas cada uno de las secciones y de la 26. Responder en 30 a 60 segundos | Jan y Camila | Se detectan respuestas cortas y se leen los archivos |
| 2:40 a 3:20 | **Ensayo de la demostración** en el staging, con cronómetro y siguiendo la sección 25 | Jan y Camila | Tiempo total, qué se corta y qué falla |
| 3:20 a 3:40 | Revisar los fallos del ensayo, anotar dudas y decidir qué escenarios se abrevian | Jan y Camila | Lista corta de ajustes |

**Antes de dormir, confirmar con la profesora (o en el foro del curso):** hora y formato de la defensa (presentación grupal y luego preguntas individuales), si hay que mostrar el staging en vivo, y si se admite el uso de asistencia de IA declarada en el registro.

### Mañana (lunes 23 de noviembre)

| Cuándo | Qué | Cómo |
|---|---|---|
| **60 minutos antes** | Despertar el staging | Abrir el sitio del staging, iniciar sesión y recorrer plan, lista y comparador. Abrir `/health` del backend: debe decir `ok` |
| 45 minutos antes | Revisar datos | Plan de la semana del 23 con 14 comidas y su lista; sugerencias con costo (no deben decir "sin precios") |
| 30 minutos antes | Preparar la terminal | Token (sección 25.1), letra grande, notificaciones apagadas. `docker compose up -d --build` y `docker compose ps` con los 4 servicios en `healthy` (para el escenario 8 y el Plan B) |
| 20 minutos antes | Pestañas | App, Swagger, Actions (último run verde), repositorio, Render (logs), README con el diagrama |
| 10 minutos antes | Refrescar el token | Repetir el bloque de login (dura 1 hora). No repetir el límite de solicitudes (escenario 6) antes de la demo |
| 5 minutos antes | Última mirada | Recorrer una vez más plan, lista y comparador para que ninguna pantalla "despierte" frente al público |

**Durante la demostración:** hablar con calma, nombrar el archivo de evidencia en cada escenario, y si algo falla, decirlo y pasar al Plan B (sección 25.3). Un fallo bien manejado suma: es el escenario 8.

**Durante las preguntas individuales:** responder con las reglas de la sección 0: primero la respuesta, luego el detalle, nombrar un archivo y reconocer limitaciones. Si no se sabe, decirlo y buscar en el repositorio.

### Qué no hacer
- No ejecutar `DELETE /api/users/me` con la cuenta de demo.
- No mostrar `.env`, `infra/terraform.tfvars` ni contraseñas.
- No lanzar el escenario del límite de solicitudes antes de mostrar el login.
- No afirmar "es seguro", "garantiza" ni "está en producción": es staging.
- No decir "la IA lo hizo y no sé": decir cómo se hizo y explicar cómo funciona.

### Si la defensa se posterga
La base de datos gratuita de Render caduca a los 30 días de su creación (cerca del 22 de diciembre). Si la defensa fuera después, hay que recrear el staging con `terraform apply` y volver a cargar los datos de la cuenta de demo.

---

# Anexos

## Anexo A. Registro de participación (resumen)

La versión completa y oficial es [registro-participacion.md](registro-participacion.md). Este resumen es para estudiar.

**Integrantes:** Jan (backend, persistencia, scraping, DevOps, documentación) y Camila (frontend, experiencia de usuario, prototipo Figma, diseño de la interacción adaptativa, revisión de calidad).

**Commits (22-11-2026, sin uniones):** 103 en total.

| Autor | Commits | Días con actividad | Primer y último commit |
|---|---|---|---|
| Jan | 79 | 6 | 2026-09-25 y 2026-11-22 |
| Camila Torres | 24 | 3 | 2026-09-26 y 2026-09-28 |

Por mes: septiembre, Jan 25 y Camila 24; noviembre, Jan 54 (3 el día 21 y 51 el día 22).

| Área | Jan | Camila |
|---|---|---|
| Backend | 35 | 0 |
| Python | 17 | 0 |
| Frontend (sin Android) | 25 | 19 |
| Android | 1 | 0 |
| CI/CD y Docker | 12 | 0 |
| Infraestructura | 3 | 0 |
| Documentación | 29 | 5 |

**Pull requests:** 19 unidos. Camila unió #1, #3, #5, #6, #9, #11, #12, #13, #15 y #16; Jan unió #2, #4, #10, #17, #19, #20, #21 y #22 (las de esta etapa con apoyo del asistente de IA, por su instrucción); la #18 la marcó GitHub como unida al llevar `develop` sus commits.

**Declaraciones a confirmar por Camila:**
1. Camila tuvo problemas con su equipo anterior y se incorporó a este proyecto; parte del trabajo se subió desde la cuenta de Jan.
2. Camila revisó y validó el trabajo.
3. La EP2 se entregó con retraso (prevista para el 19 de octubre), por lo que el desarrollo de esta etapa se concentró en los días 21 y 22 de noviembre, con asistencia de IA (Claude, bajo la dirección de Jan, sin línea de coautor en los commits).

**Lo que el historial no puede mostrar:** diseño (Figma), revisión de código y decisiones en reuniones; quién escribió realmente cada cambio hecho desde la cuenta compartida o con asistencia de IA; la importancia relativa de cada commit.

## Anexo B. Esquema de la presentación breve (6 diapositivas)

La presentación grupal es breve y la demostración es lo central. Esquema sugerido, con una idea por diapositiva:

1. **Problema y usuarios:** compras sin lista, ingredientes que sobran, falta de comparación entre tiendas. Quién lo usa: estudiantes, parejas y familias.
2. **Solución y valor:** plan semanal, lista normalizada, costo en Jumbo y Santa Isabel, sugerencias baratas y explicables. Las cifras: 31 ingredientes con precio en ambas tiendas, 25 recetas.
3. **Arquitectura:** el diagrama de la sección 2 (frontend, NestJS, Python, PostgreSQL, scraping) y por qué cada decisión (un solo dueño de la base, Python aislado, reglas en vez de aprendizaje automático).
4. **Capacidad adaptativa:** la fórmula, los controles de la persona y los resultados de la simulación (25 % a 56 % menos que la aleatoria), con su limitación.
5. **Calidad y DevSecOps:** 527 pruebas, 24 checks en el CI, escaneos de seguridad, despliegue y rollback en staging, accesibilidad con axe.
6. **Limitaciones y siguientes pasos:** sin medición con usuarios, staging gratuito, APK sin probar en dispositivo, actualización de precios manual; y lo que sigue.

Si hay tiempo, se puede convertir este esquema en un archivo de diapositivas.
