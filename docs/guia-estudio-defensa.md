# Guía de estudio para la presentación y la defensa técnica individual

Documento único para que Jan y Camila estudien el mismo material y respondan de forma coherente. Está verificado contra el repositorio al **22-11-2026** (rama `develop`). Si algo cambia en el código, hay que actualizar la sección correspondiente.

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
| 5 | Ensayo de la demo en el staging (sección 25) con cronómetro | 40 min |

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

## 25. Demo en el staging (guion y preparación)

Tiempo total sugerido: 10 minutos. El guion completo con textos para decir está en [guion-demo.md](guion-demo.md) (escrito pensando en local; **en la demo se usa el staging**).

### Preparación (30 minutos antes)

| Qué | Cómo |
|---|---|
| Despertar los 3 servicios | Abrir https://menusmart-staging-frontend.onrender.com, iniciar sesión y recorrer plan, lista y comparador. Abrir https://menusmart-staging-backend.onrender.com/health: debe decir `"status":"ok"` con `database` y `pythonService` en `ok`. La primera visita puede tardar cerca de un minuto |
| Datos de demo | La cuenta de Jan tiene 14 comidas en la semana del 23 de noviembre (con lista de 27 ingredientes) y 8 recetas en la del 30 de noviembre. **Sin usar la contraseña en pantalla** |
| Precios | Cargados el 22-11 para Jumbo y Santa Isabel (cobertura 31 de 31). No hay problema de "desactualizado" hasta 48 horas después |
| Pestañas abiertas | La app, Swagger (`/api/docs`), GitHub Actions (el último run verde de `CI` en `develop`), el repositorio y una terminal |
| Evitar | Mostrar contraseñas, el archivo `.env` o `terraform.tfvars` |

### Cómo cubrir los 10 puntos de la demostración

1. **Recuperación automatizada:** mostrar la última ejecución de precios (`GET /api/prices/quality` o `/api/prices/runs` en Swagger) o lanzar una nueva con `POST /api/prices/refresh` (tarda cerca de un minuto por tienda; se permite una cada 10 minutos).
2. **Validación y preparación:** explicar el contrato Pydantic, la deduplicación y la métrica de registros válidos y descartados.
3. **Procesamiento en FastAPI:** normalizar ingredientes (`/api/ingredients/normalize` o generar la lista en la app) y mostrar el `0,5 kg` de arroz sumado de dos comidas.
4. **Comunicación NestJS-FastAPI:** el `X-Request-ID` que viaja entre ambos y la clave de servicio.
5. **Persistencia:** el modelo de datos y las migraciones.
6. **Consulta y visualización:** el comparador, la lista con costo en cada tienda y la pantalla de sugerencias.
7. **Pipeline:** mostrar en GitHub Actions un run verde con los 9 jobs, y, si hay tiempo, lanzar "Rollback de staging" con `solo-frontend` (seguro y corto, 30 segundos).
8. **Staging:** la URL, el `/health` en `ok` y el job `deploy-staging` en verde.
9. **Métrica de evaluación:** la calidad de datos y la evaluación del recomendador contra las bases (sección 14).
10. **Error o indisponibilidad:** explicar y mostrar las pruebas de recuperación (`/health` con `degraded`, 503 limpio, datos anteriores disponibles). Si se quiere mostrar en vivo, se puede suspender el servicio Python en el panel de Render, **pero se tarda en reanudar y es arriesgado con servicios gratuitos**; es más seguro mostrar las pruebas.

### Para mostrar "me arrepentí" (cambios en vivo)

1. **Editar una comida:** abrir "Arroz con pollo" del lunes y cambiarle el día o las porciones.
2. **Regenerar la lista:** se actualiza y conserva lo ya marcado como comprado.
3. **Eliminar una comida** ("Tortilla de papas") y regenerar: baja el costo.
4. **Aceptar una sugerencia** en un hueco libre del plan y borrarla si te arrepientes.
5. **Rechazar una receta y restablecer los rechazos:** el estofado de cerdo y las hamburguesas ya están rechazados y vuelven al restablecer.
6. **Mover el deslizador de costo contra reutilización** y mostrar que el orden cambia; **desactivar la adaptación** para volver al orden base.

### Si algo falla

- **Un servicio tarda en responder:** es el plan gratuito. Decirlo ("está despertando, en un servicio de pago esto no ocurre") y esperar.
- **Staging no responde:** levantar el entorno local con Docker Compose (`docker compose up -d --build`, app en `http://localhost:8080`) y decirlo desde el primer minuto.
- **El scraper falla:** mostrar que los precios anteriores siguen disponibles con su fecha. Eso es justamente la recuperación ante indisponibilidad.

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
