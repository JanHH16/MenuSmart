# Guion de la demostración (10 minutos)

Cubre los 8 escenarios que exige el enunciado (sección 28, "Demostración"): funcionamiento normal, capacidad adaptativa, información web, pipeline de GitHub Actions, evidencia de pruebas, controles de seguridad, logs, métricas y salud, y error o degradación controlada.

> **Regla del enunciado:** no basta con capturas ni videos; la aplicación debe ejecutarse y demostrarse **en el ambiente de staging**. Hoy el staging no está desplegado (ver [checklist-entrega.md](checklist-entrega.md)). Este guion está escrito para el ambiente que exista ese día: si hay staging, se usa su URL; si no, se usa el entorno local con Docker Compose y se dice con claridad. Ver el [plan B](#plan-b).

Algunas rutas y comandos dependen de ramas que deben estar unidas (`/api/metrics` y los logs con id de solicitud: `feature/observability`; límite de solicitudes, cabeceras y `/api/users/me`: `feature/seguridad`; pipeline completo: `feature/pipeline-staging` y `feature/ci-auditoria`). Cada paso lo indica.

## Antes de empezar (preparación, 20 minutos antes)

| Qué | Cómo comprobarlo |
|---|---|
| Todo corriendo | `docker compose up -d --build` y luego `docker compose ps`: los 4 servicios en `healthy` |
| Salud | `curl http://localhost:3000/health` devuelve `"status":"ok"` con `database` y `pythonService` en `ok` |
| Precios cargados y recientes | Abrir el comparador: debe mostrar productos y la fecha de actualización de ambas tiendas. Si no hay precios, actualizar **con anticipación** (en la última medición tomó entre 37 y 43 segundos por tienda y puede tardar más; el mínimo entre dos actualizaciones exitosas es de 10 minutos, así que no se puede repetir en vivo) |
| Cuenta de demo | Registrada y con sesión iniciada en el navegador. Otra cuenta vacía para mostrar el estado inicial |
| Plan con datos | Cuenta de demo con 2 o 3 comidas planificadas (por ejemplo "Arroz con pollo" y "Ensalada chilena") y una lista ya generada |
| Token para la terminal | PowerShell: `$r = Invoke-RestMethod -Method Post http://localhost:3000/api/auth/login -ContentType "application/json" -Body '{"email":"demo@example.test","password":"<clave de demo>"}'; $h = @{ Authorization = "Bearer $($r.accessToken)" }`. Bash: `TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@example.test","password":"<clave de demo>"}' \| python -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")` |
| Pestañas abiertas | App (`http://localhost:8080`), Swagger (`http://localhost:3000/api/docs`), GitHub Actions del repositorio, `docs/` en el editor, una terminal en la raíz del repositorio |
| Pruebas ya probadas | Haber corrido las pruebas una vez antes (para que las dependencias estén instaladas) |
| Último run verde de CI | Tener a mano la URL del run (Actions, workflow `CI`) |
| Tamaño de letra | Aumentar la fuente de terminal y navegador |

No usar en pantalla contraseñas reales ni el archivo `.env`.

## Línea de tiempo

| Minutos | Escenario | Qué se muestra |
|---|---|---|
| 0:00 a 0:45 | Contexto | Problema y arquitectura (diagrama del README) |
| 0:45 a 2:30 | 1. Funcionamiento normal | Plan, lista de compras y costo por tienda |
| 2:30 a 4:00 | 2. Capacidad adaptativa | Sugerencias, explicación, controles y comparación con la base |
| 4:00 a 5:00 | 3. Información web | Comparador, procedencia, calidad de datos |
| 5:00 a 6:00 | 4. Pipeline | GitHub Actions |
| 6:00 a 6:45 | 5. Pruebas | Ejecución de pruebas y evidencia en CI |
| 6:45 a 7:30 | 6. Seguridad | Autenticación, validación, límites, secretos |
| 7:30 a 8:30 | 7. Logs, métricas, salud | `/health`, `/api/metrics`, logs |
| 8:30 a 9:30 | 8. Degradación controlada | Servicio Python caído |
| 9:30 a 10:00 | Cierre | Limitaciones y qué sigue |

## Contexto (0:00 a 0:45)

**Pantalla:** README en el diagrama de arquitectura.

**Decir:** "MenuSmart ayuda a planificar la semana y gastar menos. El problema: se compra sin lista, se repiten ingredientes que sobran y no se comparan tiendas. La arquitectura tiene un frontend Angular con Ionic, un backend NestJS dueño de la base PostgreSQL, y un servicio Python que normaliza ingredientes y obtiene precios de Jumbo y Santa Isabel, sin acceso a la base. Todo corre con Docker Compose y se despliega con Terraform en Render."

## 1. Funcionamiento normal (0:45 a 2:30)

1. **Pantalla:** app, cuenta de demo, pestaña **Plan semanal**. Mostrar las comidas planificadas.
2. **Hacer:** abrir **Agregar comida**, escribir un ingrediente con texto libre (por ejemplo "tomates", 500, "g") y guardar.
3. **Pestaña Lista de compras:** generar la lista de la semana.
4. **Mostrar:** los ingredientes ya sumados aunque estaban escritos distinto, el costo estimado en Jumbo y en Santa Isabel, cuál conviene y los ítems que no se pudieron valorizar (con el motivo).

**Decir:** "El servicio Python limpia y suma los ingredientes: 'Tomates 500 g' y 'tomate 1 kg' quedan en una línea de 1,5 kg. El backend valoriza cada ítem con los precios vigentes de las dos tiendas y solo suma en el total los ítems con precio en ambas, para que la comparación sea justa. Los que no tienen precio lo dicen."

**Datos a tener listos:** al menos un ingrediente fuera del catálogo (por ejemplo "cilantro") para mostrar un ítem sin precio.

**Evidencia en el repositorio:** `docs/normalizacion-de-ingredientes.md`, `backend/src/shopping-lists/costo.ts`.

## 2. Capacidad adaptativa (2:30 a 4:00)

1. **Pantalla:** la pantalla de sugerencias del plan semanal (la que ofrece recetas sugeridas).
2. **Mostrar:** las sugerencias ordenadas, el costo por porción, los ingredientes que reutiliza del plan y la **explicación** de cada una.
3. **Aceptar** una sugerencia y volver a pedirlas: las que comparten ingredientes con el plan suben.
4. **Rechazar** una: deja de aparecer. Cambiar la **importancia del costo** y mostrar que el orden cambia.
5. **Comparar con la versión base** (desde la terminal, con el token):

```powershell
# PowerShell
Invoke-RestMethod "http://localhost:3000/api/recommendations?limite=3" -Headers $h | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:3000/api/recommendations?limite=3&adaptativo=false" -Headers $h | ConvertTo-Json -Depth 6
```

```bash
# bash
curl -s "http://localhost:3000/api/recommendations?limite=3" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3000/api/recommendations?limite=3&adaptativo=false" -H "Authorization: Bearer $TOKEN"
```

**Decir:** "El recomendador es una política de reglas, no un modelo entrenado: puntaje = peso del costo por el costo normalizado más peso de la reutilización por la fracción de ingredientes que ya están en tu plan. No hay datos históricos para entrenar un modelo y así es explicable al usuario. El usuario controla el peso, excluye ingredientes, rechaza o apaga la adaptación. Contra una versión sin adaptación, la simulación con precios reales dio una canasta entre 25% y 56% más barata; es una simulación y la prueba con usuarios sigue pendiente."

**Datos a tener listos:** plan con 1 o 2 recetas para que se vea la reutilización; una semana vacía para contraste.

**Evidencia:** `docs/capacidad-adaptativa.md`, `docs/evaluacion-recomendador.md`, `backend/src/recommendations/scoring.ts`.

## 3. Obtención y uso de información web (4:00 a 5:00)

1. **Pantalla:** pestaña **Comparador**. Mostrar mejor precio por ingrediente en cada tienda, productos idénticos en ambas, la fecha de cada precio y el aviso de desactualizado.
2. **Terminal (calidad de los datos):**

```powershell
# PowerShell
Invoke-RestMethod http://localhost:3000/api/prices/quality -Headers $h | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:3000/api/prices/runs?limite=2" -Headers $h | ConvertTo-Json -Depth 4
```

```bash
# bash
curl -s http://localhost:3000/api/prices/quality -H "Authorization: Bearer $TOKEN"
```

3. **Mostrar:** porcentaje de registros válidos, duplicados, descartados, cobertura del catálogo y horas desde la última actualización.

**Decir:** "Los precios salen del bloque JSON-LD de la búsqueda de cada tienda. El scraper respeta robots.txt, hace una solicitud por segundo y se identifica. Cada precio guarda tienda, fecha, URL y la ejecución que lo trajo. Los datos de hoy: más de 95% de registros válidos y 31 de 31 ingredientes con precio en ambas tiendas. La actualización es bajo demanda. No ejecuto un nuevo scraping en vivo porque hay un mínimo de 10 minutos entre actualizaciones y consulta tiendas reales."

**Evidencia:** `docs/calidad-de-datos.md`, ADR-002 y ADR-003.

## 4. Pipeline de GitHub Actions (5:00 a 6:00)

1. **Pantalla:** pestaña Actions del repositorio, último run del workflow `CI` en verde.
2. **Mostrar:** los jobs (backend, migraciones, frontend, Python, integración NestJS y FastAPI, Terraform, detección de secretos, imágenes con Trivy, despliegue a staging) y que las imágenes y el despliegue dependen de que los anteriores pasen (quality gate).
3. Abrir un job (por ejemplo `Backend`) y mostrar los pasos: lint, build, pruebas, `npm audit --audit-level=high`.
4. Si hay staging: mostrar el job `deploy-staging` y sus health checks.

**Decir:** "Cada push corre lint, pruebas, análisis de dependencias, detección de secretos, construcción y escaneo de imágenes y validación de Terraform. Solo si todo pasa, un push a develop despliega a staging y verifica la salud. El umbral de `npm audit` es 'high': antes era 'critical' y dejaba pasar vulnerabilidades altas."

**Datos a tener listos:** la URL de un run completo y verde; un run fallido si existe, para mostrar que el gate funciona. Los workflows completos están en las ramas `feature/pipeline-staging` y `feature/ci-auditoria` hasta que se unan.

**Evidencia:** `.github/workflows/ci.yml`, `docs/pipeline-y-staging.md`, `docs/migraciones-y-auditoria.md`.

## 5. Evidencia de pruebas (6:00 a 6:45)

**Terminal:**

```bash
cd python-service && pytest -q            # 115 pruebas, cerca de 1 segundo
cd ../backend && npx jest                 # 140 pruebas en 13 suites, unos 5 segundos
cd ../frontend && npx ng test --watch=false   # 70 pruebas
```

```powershell
cd python-service; pytest -q
cd ..\backend; npx jest
cd ..\frontend; npx ng test --watch=false
```

**Decir:** "Hay pruebas unitarias en los tres componentes y pruebas e2e del backend contra una PostgreSQL real. Las partes sensibles tienen sus propias pruebas: el contrato entre NestJS y FastAPI, la normalización, la recuperación ante fallas del scraper, el cálculo de costos y el recomendador. En CI la integración levanta el servicio Python real y ejecuta el cliente de NestJS contra él."

**Datos a tener listos:** el log del CI con las pruebas e2e (no se corren en vivo porque necesitan base de datos).

**Evidencia:** `python-service/tests/`, `backend/src/**/*.spec.ts`, `backend/test/`.

## 6. Controles de seguridad (6:45 a 7:30)

1. **Sin token se rechaza:**

```bash
curl -i http://localhost:3000/api/prices/compare            # 401
```
```powershell
try { Invoke-RestMethod http://localhost:3000/api/prices/compare } catch { $_.Exception.Response.StatusCode.value__ }   # 401
```

2. **Validación estricta** (campos desconocidos y datos inválidos se rechazan con 400):

```bash
curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"no-es-un-correo","campoExtra":1}'
```

3. **Límite de solicitudes y cabeceras** (rama `feature/seguridad`): repetir 11 veces un login incorrecto hasta recibir `429`, y mostrar `curl -I http://localhost:3000/health` con las cabeceras de seguridad.
4. **Secretos:** mostrar `.env.example` (valores de ejemplo), que `.env` está en `.gitignore`, y el job de gitleaks en CI. Mostrar que los logs no contienen contraseñas ni tokens (rama `feature/observability`).
5. **Privacidad:** `GET` y `DELETE /api/users/me` (rama `feature/seguridad`): el usuario ve y borra sus datos.

**Decir:** "Contraseñas con bcrypt, JWT, validación con whitelist, consultas parametrizadas, límite de solicitudes por IP, detección de secretos en cada push y escaneo de imágenes. El servicio Python solo responde al backend: exige una clave de servicio. Las limitaciones están documentadas: no hay roles, ni recuperación de contraseña, y CORS está abierto."

**Evidencia:** `docs/seguridad-privacidad-etica.md` (rama `feature/seguridad`).

## 7. Registros, métricas y salud (7:30 a 8:30)

1. **Salud:** `curl http://localhost:3000/health` (backend, PostgreSQL y servicio Python) y `curl http://localhost:8000/health`.
2. **Métricas** (rama `feature/observability`):

```bash
curl -s http://localhost:3000/api/metrics -H "Authorization: Bearer $TOKEN"
```
```powershell
Invoke-RestMethod http://localhost:3000/api/metrics -Headers $h | ConvertTo-Json -Depth 6
```

   Mostrar tiempos de respuesta por ruta (p50 y p95), errores 5xx y resultado de las actualizaciones de precios.
3. **Logs:** `docker compose logs backend --tail 20`: líneas JSON con `requestId`; hacer una solicitud y mostrar que el mismo id aparece en el log del servicio Python (`docker compose logs python-service --tail 20`).

**Decir:** "Los logs son JSON con un identificador de solicitud que viaja del backend al servicio Python, así se sigue una petición de punta a punta. `/health` verifica la base de datos y el servicio Python. Las métricas viven en memoria y se reinician con el proceso; no hay alertas automáticas."

## 8. Error o degradación controlada (8:30 a 9:30)

1. **Apagar el servicio Python:**

```bash
docker compose stop python-service
```

2. **Mostrar el estado degradado:** `curl http://localhost:3000/health` devuelve `"status":"degraded"` con `pythonService` en `error`.
3. **Mostrar lo que sigue funcionando:** el comparador y la lista de compras ya generada se siguen viendo con los precios guardados (con su fecha); las sugerencias siguen funcionando, solo que sin medir la reutilización (cubierto por la prueba e2e "si Python no responde, igual recomienda").
4. **Mostrar lo que falla con un error claro:** generar una lista nueva responde `503` ("El servicio de procesamiento de ingredientes no está disponible en este momento"); iniciar una actualización de precios deja la corrida en estado `fallido` con el error registrado, sin borrar los precios anteriores (si la última actualización exitosa fue hace menos de 10 minutos, la API responde 429 antes de intentarlo: esperar o hacerlo con la preparación ya vieja).
5. **Recuperar:** `docker compose start python-service` y mostrar que `/health` vuelve a `ok`.

**Decir:** "Cuando el servicio de procesamiento cae, NestJS no se cuelga: responde 503 con un mensaje claro, reintenta una vez solo ante falta de respuesta, y lo que ya estaba guardado sigue disponible. Lo mismo pasa si una tienda cambia su página o bloquea al scraper: la consulta falla con un tipo de error y los precios anteriores se conservan."

**Evidencia:** `backend/test/prices.e2e-spec.ts` ("si el servicio Python no responde..."), `docs/calidad-de-datos.md`, sección 7.

## Cierre (9:30 a 10:00)

**Decir:** "Lo que no está: el staging real en Render, la prueba del APK en un dispositivo, la prueba con usuarios y la actualización automática de precios. Está documentado en las limitaciones del README. Lo siguiente es desplegar staging, medir con 5 a 10 personas y ampliar el catálogo."

## Plan B

| Si falla | Qué hacer |
|---|---|
| **Render o el staging no responde** (o no existe) | Usar el entorno local con Docker Compose (`docker compose up -d`, app en `http://localhost:8080`). Decirlo desde el primer minuto: "el staging no está disponible, demuestro el mismo código en local". Tener abierta la URL del último despliegue exitoso y del health check como evidencia secundaria, no como sustituto |
| **Plan gratuito de Render dormido** | Abrir la URL de `/health` 5 minutos antes para despertar los servicios |
| **La fuente externa (tiendas) no responde** | No hace falta: se usan los precios ya guardados. Si falla justo al mostrar la actualización, convertirlo en el escenario 8: mostrar el estado de la corrida y que los precios anteriores siguen disponibles |
| **No hay internet** | Todo corre en local salvo el scraping. Usar los precios guardados. Para simular las tiendas sin internet existe un servidor de integración que responde con páginas congeladas (`python-service/tests/servidor_integracion.py`, rama `feature/pipeline-staging`): `uvicorn tests.servidor_integracion:app --port 8000` desde `python-service/` |
| **La base está vacía o sin precios** | Preparar un respaldo: volcado de la base con precios (`pg_dump`) y restaurarlo con `psql`. Hacerlo antes de la demostración |
| **GitHub no carga** | Tener capturas de un run verde como respaldo (no como evidencia principal) y mostrar `.github/workflows/ci.yml` en el editor |
| **Una prueba falla en vivo** | Mostrar el log del último run verde del CI y explicar la causa si se conoce; no improvisar arreglos en pantalla |
| **El token expiró (1 hora)** | Volver a iniciar sesión y recargar la variable `$h` o `TOKEN` |
| **Falla el recomendador o no hay precios suficientes** | Mostrar la explicación "no hay precios suficientes" (es el comportamiento diseñado) y la salida de `adaptativo=false` |

## Si hace falta recortar tiempo

Orden de prioridad: 1, 2, 3, 8 (el núcleo del proyecto), luego 7, 6, 5 y 4. El enunciado pide los 8, así que conviene ensayar con cronómetro y abreviar los comandos antes que omitir un escenario.

## Antes del ensayo: lo que debe confirmar Jan

- Fecha y formato acordados con la profesora y si se exige el staging en vivo.
- Qué ramas estarán unidas ese día (de eso dependen `/api/metrics`, los límites de solicitudes y el pipeline completo).
- Que la pantalla de sugerencias esté integrada y qué controles ofrece (peso del costo, exclusiones, rechazo, interruptor de adaptación), para ajustar el escenario 2.
