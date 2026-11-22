# Seguridad, privacidad y ética

Este documento describe qué datos trata MenuSmart, con qué fin, quién puede hacer qué, cómo se
protegen los secretos y qué riesgos conocemos. Cada afirmación apunta al código o al test que la
respalda. Lo que no está resuelto se dice en [Limitaciones](#12-limitaciones-honestas).

Cómo reproducir la evidencia automática:

```bash
cd backend && npm run lint && npm run build && npx jest   # unitarios
cd backend && npm run test:e2e                            # necesita PostgreSQL (ver backend/README.md)
cd python-service && pytest && ruff check app tests
```

## 1. Datos personales que se procesan

| Dato | Origen | Para qué | Dónde vive | Cuánto tiempo |
|---|---|---|---|---|
| Correo electrónico | Registro | Identificar la cuenta e iniciar sesión | Tabla `users.email` (en minúsculas) | Mientras exista la cuenta |
| Nombre | Registro | Mostrarlo en la app | `users.name` | Mientras exista la cuenta |
| Hash de la contraseña (bcrypt, 12 rondas) | Registro | Verificar el inicio de sesión sin guardar la contraseña | `users.passwordHash` | Mientras exista la cuenta |
| Fecha de alta | Automático | Auditoría básica | `users.createdAt` | Mientras exista la cuenta |
| Comidas, ingredientes y listas de compra | El usuario las crea | Planificar comidas y armar la lista | `comidas`, `ingredientes`, `listas_compra`, `lista_compra_items` | Mientras exista la cuenta |
| Token de acceso (JWT) | Login o registro | Autenticar cada solicitud | Navegador del usuario (`localStorage`); el backend no lo guarda | 1 hora (`JWT_EXPIRES_IN`) |

Notas:

- No se piden teléfono, dirección, RUT, ubicación ni datos de pago. El esquema completo está en
  [`database.md`](database.md).
- Las comidas y listas pueden revelar hábitos de alimentación del usuario. Se tratan como datos
  personales: solo las ve su dueño y se borran con la cuenta (sección 9).
- Los datos de precios (productos de Jumbo y Santa Isabel) son públicos y no se asocian a ningún
  usuario (sección 8).
- Los logs de la aplicación no contienen correo, contraseña, token, cabeceras, cuerpo ni query
  string (sección 5).
- La infraestructura de alojamiento (Render) puede registrar direcciones IP a nivel de proxy. Eso
  queda fuera del control del código y no se ha revisado la política del proveedor.
- No se usan cookies, analítica ni servicios de terceros que reciban datos del usuario.

## 2. Roles y permisos

Hay un solo rol: usuario autenticado. No existe rol administrador.

| Recurso | Quién puede | Mecanismo |
|---|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /health` | Cualquiera | Públicos; los de autenticación tienen límite de solicitudes |
| `GET/DELETE /api/users/me` | Solo el dueño de la cuenta | `JwtAuthGuard`; el id sale del token, nunca de la URL ni del cuerpo |
| `/api/prices/*`, `/api/ingredients/normalize`, `/api/metrics` | Cualquier usuario autenticado | `JwtAuthGuard` en el controlador |
| Servicio Python (`/scrape/search`, `/ingredients/normalize`, `/metrics`) | Solo el backend | En Render es un servicio privado (`infra/services.tf`, `render_private_service`); no tiene autenticación propia |

Principio para los recursos del usuario (comidas, listas): toda consulta debe filtrar por el
`usuarioId` del token. Hoy `GET/DELETE /api/users/me` lo cumple; los CRUD de comidas y listas
deben seguir la misma regla al implementarse.

Test: `backend/test/prices.e2e-spec.ts` ("exige autenticación en todas las rutas") y
`backend/test/users.e2e-spec.ts` ("exige autenticación").

## 3. Autenticación y sesión

| Aspecto | Decisión | Dónde |
|---|---|---|
| Almacenamiento de contraseñas | bcrypt, 12 rondas; nunca se guarda ni se registra la contraseña | `auth/auth.constants.ts`, `auth/auth.service.ts` |
| Política de contraseña | 8 a 72 caracteres, al menos una letra y un número (72 es el límite real de bcrypt) | `auth/dto/register.dto.ts`, `auth/dto/auth-dto.spec.ts` |
| Email | Se recorta y pasa a minúsculas al registrar y al entrar; la búsqueda no distingue mayúsculas para no dejar fuera cuentas antiguas | `auth/dto/credentials.ts`, `users/users.service.ts` |
| Mensajes de login | Mismo mensaje y mismo código (401) para correo inexistente y contraseña incorrecta; se compara siempre contra un hash señuelo para igualar el tiempo de respuesta | `auth/auth.service.ts`; tests en `auth.service.spec.ts` y `users.e2e-spec.ts` |
| JWT | HS256 fijado al firmar y al verificar (rechaza `alg: none`); expira en 1 hora por defecto | `auth/auth.module.ts`, `auth/strategies/jwt.strategy.ts`; test e2e "alg none" |
| Cuenta borrada | El token deja de servir: la estrategia comprueba que el usuario exista en cada solicitud | `jwt.strategy.ts`; test e2e "el token deja de servir" |
| `JWT_SECRET` | Obligatorio: sin él el backend no arranca (no hay valor por defecto) | `auth.module.ts`, `jwt.strategy.ts` |
| Fuerza bruta | Límite por IP en login y registro (sección 4) | `rate-limit.ts` |

Lo que no se hizo (es trabajo mayor): verificación de correo, recuperación de contraseña, bloqueo
de cuenta tras N fallos, refresh tokens con revocación, doble factor. Ver sección 12.

## 4. Validación, sanitización y protección HTTP

- **Validación de entrada:** `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`
  (`setup-app.ts`): los campos desconocidos se rechazan con 400. Cada DTO usa `class-validator`
  con límites de largo (correo 254, nombre 100, contraseña 72). El servicio Python valida con
  Pydantic y rechaza los registros inválidos antes de devolverlos (`scrapers/schemas.py`).
- **Inyección SQL:** TypeORM parametriza las consultas; el SQL manual de `prices/prices.sql.ts`
  usa solo parámetros posicionales (`$1`, `$2`...), sin concatenar texto.
- **XSS:** la API responde solo JSON. Angular escapa por defecto y el frontend no usa
  `bypassSecurityTrust*`. La respuesta de la API lleva una CSP `default-src 'none'`.
- **Cabeceras (helmet):** CSP estricta para la API, `X-Content-Type-Options: nosniff`,
  `Strict-Transport-Security`, `Referrer-Policy: no-referrer`, `X-Frame-Options`,
  `Cross-Origin-Opener-Policy`; se elimina `X-Powered-By`. `/api/docs` (Swagger UI) tiene su
  propia política que permite scripts solo del mismo origen y estilos en línea; ninguna otra ruta
  la hereda. Se comprobó además a mano que Swagger UI carga sin errores en el navegador.
  Código: `setup-app.ts`. Tests: `backend/test/seguridad.e2e-spec.ts`.
- **CORS:** `enableCors()` sin restricciones de origen, igual que antes; los tests comprueban que
  el preflight y `Access-Control-Allow-Origin` siguen funcionando. Es amplio: ver sección 12.
- **Límite de solicitudes por IP** (`@nestjs/throttler`, `rate-limit.ts`, variables
  `RATE_LIMIT_*` en `backend/.env.example`). Cada ruta cuenta aparte:

  | Ruta | Por defecto | Motivo |
  |---|---|---|
  | Todas (global) | 300 por minuto | Frenar abusos evidentes |
  | `POST /api/auth/login` y `DELETE /api/users/me` | 10 por minuto | Fuerza bruta de contraseñas |
  | `POST /api/auth/register` | 5 por minuto | Creación masiva de cuentas |
  | `POST /api/prices/refresh` | 5 por minuto | Cada llamada dispara scraping de terceros |

  `/health` queda fuera para no afectar a los orquestadores. Un valor inválido en una variable
  vuelve al valor por defecto, nunca a "sin límite". Detrás de un proxy hay que definir
  `TRUST_PROXY` (número de proxies de confianza) o todos los usuarios compartirían IP. Los
  contadores viven en memoria: con varias instancias cada una cuenta por separado.
  Tests: `seguridad.e2e-spec.ts` ("login responde 429...", "register y refresh...", "valor
  inválido..."). Las suites e2e existentes elevan los límites con `test/setup-env.ts`, sin
  desactivar el guard.

## 5. Registros (logs) sin datos sensibles

- **Formato:** una línea JSON por registro con `requestId` (cabecera `X-Request-ID`, la misma
  que viaja de NestJS al servicio Python), nivel, servicio y ruta (`observability/`).
- **Qué registra el middleware HTTP:** método, ruta **sin query string**, estado y duración. No
  lee cabeceras ni cuerpo. Test: `observability.middleware.spec.ts` ("registra solo método, ruta
  sin query, estado y duración").
- **Redacción defensiva:** antes de escribir, `redactar()` reemplaza por `[REDACTED]`, en
  profundidad, cualquier clave que contenga `password`, `token`, `secret`, `authorization`,
  `cookie` o `api_key` (cubre `passwordHash`, `accessToken`, `set-cookie`...), y tacha los tokens
  `Bearer` y los JWT que aparezcan dentro de un texto o de una traza de error. Tolera referencias
  circulares y objetos muy profundos.
  Código: `backend/src/observability/structured-logger.ts` y `python-service/app/observability.py`.
  Tests: `structured-logger.spec.ts`, `test_observability.py` (`TestRedaccionDeSecretos`).
- **Prueba de punta a punta:** `users.e2e-spec.ts` ("registros sin secretos") captura todo lo que
  el backend escribe durante registro, login (correcto e incorrecto), consulta de perfil y
  borrado de cuenta, y verifica que no aparecen la contraseña, el token, ningún JWT, ningún hash
  bcrypt ni el correo.
- **Métricas y salud:** `GET /health` (base de datos y servicio Python), `GET /api/metrics`
  (tiempos de respuesta por ruta, p50 y p95, errores 5xx, resultado de las actualizaciones).
  Las métricas no contienen datos de usuarios. Requieren token.
- **Alertas:** hoy son básicas: el estado `degraded` de `/health` y los errores 5xx de las
  métricas, que se revisan a mano o con el monitor del proveedor. No hay un sistema de alertas
  automáticas.

## 6. Gestión de secretos

| Secreto | Dónde vive | Control |
|---|---|---|
| `DATABASE_PASSWORD`, `JWT_SECRET` en desarrollo | Archivo `.env` local | `.env` está en `.gitignore`; solo se versionan `.env.example` con valores de ejemplo (`changeme`) |
| Secretos en CI | GitHub Secrets (`JWT_SECRET_TEST`); si no existe, el pipeline usa un valor de relleno que no es real | `.github/workflows/ci.yml` |
| Secretos en producción | Variables del servicio en Render, pasadas por Terraform como variables `sensitive` | `infra/variables.tf`, `infra/services.tf`; `*.tfvars` y `*.tfstate` están en `.gitignore`, solo se versiona `terraform.tfvars.example` |
| Detección de fugas | gitleaks en cada ejecución de CI, sobre todo el historial (`fetch-depth: 0`), falla el pipeline si encuentra algo | job `secrets-scan`, `.gitleaks.toml` |
| Dependencias vulnerables | `npm audit`, `pip-audit` y escaneo Trivy de las imágenes (CRITICAL y HIGH) | `ci.yml`, `.trivyignore` |
| Secretos en logs | Redacción automática (sección 5) | tests de la sección 5 |

Recomendación no automatizada: usar un `JWT_SECRET` aleatorio de al menos 32 caracteres en cada
ambiente. El código solo exige que exista; el valor `changeme` de los ejemplos no debe llegar a
producción.

## 7. Modelo de amenazas

| Amenaza | Mitigación | Evidencia |
|---|---|---|
| Adivinar contraseñas por fuerza bruta | Límite de 10 intentos por minuto por IP, bcrypt a 12 rondas, política de contraseña | `seguridad.e2e-spec.ts` (429 en login), `auth-dto.spec.ts` |
| Averiguar qué correos están registrados | Login con mensaje único y tiempo igualado | `auth.service.spec.ts`, `users.e2e-spec.ts` |
| Robo o reutilización de un token tras borrar la cuenta | La estrategia JWT comprueba que la cuenta exista | `users.e2e-spec.ts` ("el token deja de servir") |
| Token forjado con `alg: none` | Algoritmo HS256 fijado al verificar | `users.e2e-spec.ts` ("alg none") |
| Borrado de cuenta por alguien con el token robado | `DELETE /api/users/me` exige además la contraseña actual y tiene límite propio | `users.e2e-spec.ts` (403 con contraseña incorrecta) |
| Fuga de secretos en logs | Redacción en profundidad y middleware que no registra cabeceras, cuerpo ni query | secciones 5 |
| Fuga de secretos en el repositorio | `.gitignore`, gitleaks en CI, Terraform con variables `sensitive` | `ci.yml`, `.gitleaks.toml` |
| Inyección SQL o campos inesperados | Consultas parametrizadas, `whitelist` y `forbidNonWhitelisted` | `prices.e2e-spec.ts` ("valida los parámetros de entrada"), `auth-dto.spec.ts` |
| Clickjacking, sniffing de contenido, fugas por referrer | Cabeceras de helmet | `seguridad.e2e-spec.ts` |
| Abuso de la actualización de precios (carga sobre las tiendas) | Límite por IP, mínimo de minutos entre actualizaciones exitosas, una sola actualización en curso (409), 1 solicitud por segundo a cada tienda | `prices.e2e-spec.ts` (409 y 429), `test_scraper_service.py` |
| Fuente externa maliciosa o corrupta (redirección, respuesta enorme, datos inválidos) | Redirecciones solo al mismo dominio, tope de 5 MB, validación de cada registro | `test_scraper_service.py` ("redirección fuera del dominio", "respuesta demasiado grande", "descarta items inválidos") |
| Acceso directo al servicio Python | Servicio privado en Render | `infra/services.tf` |
| Vulnerabilidades en dependencias o imágenes | `npm audit`, `pip-audit`, Trivy en CI | `ci.yml` |

## 8. Riesgos de la fuente externa (scraping de Jumbo y Santa Isabel)

Decisiones y evidencia en [ADR-002](adr/002-fuentes-datos-web.md) y
[ADR-003](adr/003-metodo-scraping.md).

- **`robots.txt`:** se lee y se interpreta antes de cada consulta, con soporte de comodines; se
  cachea 1 hora. Si no se puede leer, no se scrapea. Líder se descartó porque su `robots.txt`
  bloquea el catálogo. Tests: `test_scraper_robots.py`,
  `test_scraper_service.py` ("respeta robots", "robots no disponible impide scrapear").
- **Términos de servicio:** el ADR-002 cita su revisión como criterio, pero el repositorio no
  guarda un análisis de los términos de uso de cada tienda. Ver sección 12.
- **Carga sobre la tienda:** como máximo 1 solicitud por segundo por tienda, timeout de 10 s,
  2 reintentos con espera creciente y sin reintentar ante 403 o 429. User-Agent identificable
  (`MenuSmartBot/1.0` con la URL del repositorio).
- **Redirecciones:** solo se aceptan dentro del dominio de la tienda. **Tamaño:** se rechaza toda
  respuesta de más de 5 MB.
- **Minimización de datos:** solo se leen datos públicos de producto (nombre, marca, precio,
  disponibilidad, URL e imagen). No se accede a carrito, cuenta ni checkout, no se envían datos
  del usuario a las tiendas y las consultas son términos fijos de un catálogo de 31 productos,
  no texto escrito por el usuario.
- **Calidad y trazabilidad:** cada precio guarda tienda, fecha de obtención, ejecución y URL de
  origen. `GET /api/prices/quality` entrega porcentaje de registros válidos, duplicados y
  descartados, tasa de errores y cobertura.
- **Fragilidad:** si la tienda cambia su estructura, la consulta falla con error `estructura` y
  no se guardan datos; los precios anteriores siguen disponibles con su fecha
  (test e2e "si el servicio Python no responde...").

## 9. Control del usuario, eliminación y actualización de datos

- **Ver sus datos:** `GET /api/users/me` devuelve correo, nombre y fecha de alta, nunca la
  contraseña ni su hash. Test unitario `users.service.spec.ts` y e2e `users.e2e-spec.ts`.
- **Eliminar la cuenta:** `DELETE /api/users/me` con la contraseña actual en el cuerpo. Responde
  204 y borra al usuario y, por las claves foráneas `ON DELETE CASCADE` (definidas en las
  entidades y en la migración `1790477928088-DominioComidasProductosListas.ts`), sus comidas,
  ingredientes, listas y sus ítems. Con contraseña incorrecta responde 403 y no borra nada (se usa
  403 y no 401 porque el frontend cierra la sesión ante un 401). Tras el borrado el token deja de
  servir y no se puede volver a entrar. Test e2e: `users.e2e-spec.ts` (bloque `DELETE`), que
  comprueba en la base de datos que no queda nada.
- **Actualizar datos:** hoy no existe un endpoint para cambiar el nombre, el correo o la
  contraseña. La única vía es borrar la cuenta y crear otra. Es una brecha frente a la
  rectificación de datos (ver sección 12). Las comidas y listas se podrán editar cuando existan
  sus endpoints.
- **Copias de seguridad:** el borrado actúa sobre la base viva. Las copias que mantenga el
  proveedor de base de datos no se han revisado.

## 10. Sesgos posibles

- **Preferencia por lo más barato:** el comparador ordena por precio unitario y señala la tienda
  más barata. Eso favorece el precio por sobre otros criterios (calidad, origen, marca, cercanía,
  salud) y puede empujar al usuario hacia una sola opción. Un futuro recomendador que optimice el
  gasto heredaría ese sesgo.
- **Cobertura limitada:** solo hay 2 supermercados (ambos del grupo Cencosud), 31 términos de
  búsqueda y los primeros 40 resultados de cada uno. Quedan fuera tiendas de barrio, ferias,
  Líder, Unimarc y Tottus, y los productos fuera del catálogo. "La más barata" significa "la más
  barata entre estas dos tiendas para estos productos".
- **Comparación entre productos parecidos:** el precio unitario se deriva del nombre ("1 kg",
  "400 g"); si el nombre no trae cantidad no se calcula. Un producto sin precio unitario puede
  quedar fuera de la comparación aunque sea más barato.
- **Precio vigente con oferta:** no se distingue el precio normal del de oferta, que puede ser
  temporal.
- **Normalización de ingredientes:** el servicio Python solo une ingredientes con el mismo
  nombre y unidad (ignorando mayúsculas y espacios). No reconoce sinónimos ni nombres regionales
  ("palta" y "aguacate" quedan separados), así que la lista de compra puede repetir un producto.
- **Disponibilidad geográfica:** los precios y la disponibilidad pueden variar por comuna y no se
  modelan.

Mitigaciones actuales: la API siempre devuelve la fecha de cada precio, la tienda y la URL de
origen, y `GET /api/prices/quality` expone la cobertura. Pendiente: mostrar en la interfaz el
alcance real de la comparación.

## 11. Transparencia y accesibilidad

- **Transparencia:** el usuario puede ver de dónde sale cada precio (tienda, URL, fecha) y cuán
  actualizado está; las métricas de calidad son públicas para cualquier usuario autenticado. La
  API está documentada en Swagger (`/api/docs`) con descripción de cada operación. Este documento
  explica qué datos se guardan y cómo borrarlos.
- **Accesibilidad:** no se hizo una auditoría de accesibilidad de la interfaz en este trabajo.
  El frontend usa Ionic y Angular, que aportan una base (etiquetas, foco, escape de contenido),
  y hay `aria-label` y `aria-hidden` en algunos elementos, pero no hay pruebas automáticas de
  accesibilidad ni verificación de contraste, lectores de pantalla o navegación por teclado.

## 12. Limitaciones honestas

Lo que este trabajo no resuelve, ordenado por importancia:

1. **Sin rectificación de datos:** no se puede editar el perfil ni cambiar la contraseña.
2. **Sin recuperación de contraseña ni verificación de correo:** se pueden registrar correos de
   terceros. El registro responde 409 si el correo existe, lo que permite averiguar si un correo
   está registrado (el login no lo revela, el registro sí). Resolverlo exige verificación por
   correo.
3. **Sin roles:** cualquier usuario autenticado puede ver `/api/metrics` y disparar
   `/api/prices/refresh` (limitado por tasa y por intervalo mínimo, pero no por permiso). Debería
   ser una acción de administrador.
4. **Token en `localStorage`:** un XSS en el frontend podría robarlo. Una cookie `HttpOnly` con
   protección CSRF sería más segura. Además no hay revocación individual de tokens (solo expiran
   a la hora o desaparecen al borrar la cuenta).
5. **CORS abierto** a cualquier origen. Conviene limitarlo al dominio del frontend al desplegar.
6. **Límites en memoria:** con más de una instancia del backend los límites se multiplican;
   haría falta un almacén compartido (Redis).
7. **Términos de servicio de las tiendas:** se respetó `robots.txt` y se limitó la carga, pero no
   hay un análisis documentado de los términos de uso de Jumbo y Santa Isabel. Antes de un uso
   más allá del curso habría que revisarlos o pedir autorización.
8. **Contraseñas existentes:** las cuentas creadas antes de este cambio conservan su hash de 10
   rondas y pueden tener contraseñas de 6 o 7 caracteres; la política nueva solo rige al
   registrar. El formulario de registro del frontend todavía valida 6 caracteres como mínimo y
   debe alinearse con el backend (8, con letra y número), o mostrará el error 400 del servidor.
9. **Accesibilidad sin auditar** (sección 11).
10. **Sin alertas automáticas** ni almacenamiento persistente de métricas (viven en memoria y se
    reinician con el proceso).
11. **Despliegue en vivo pendiente:** la infraestructura se valida con `terraform validate` y
    `plan`, pero no se ha desplegado, así que las cabeceras, el `TRUST_PROXY` y las
    configuraciones del proveedor no se han verificado en un entorno real.
