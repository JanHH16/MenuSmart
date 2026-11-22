# Migraciones y auditoría de dependencias

Este documento explica dos decisiones del pipeline de CI (`.github/workflows/ci.yml`):

1. Qué severidad de vulnerabilidades hace fallar la auditoría de dependencias.
2. Cómo se garantiza que la estructura de la base de datos sea reproducible
   **exclusivamente con migraciones**, aunque en desarrollo se use `synchronize`.

## 1. Auditoría de dependencias: política de severidad

| Componente | Herramienta | Qué hace fallar el job |
| --- | --- | --- |
| Backend (NestJS) | `npm audit --omit=dev --audit-level=high` | Vulnerabilidades de severidad **alta o crítica** en dependencias de producción |
| Frontend (Angular) | `npm audit --omit=dev --audit-level=high` | Igual que el backend |
| Servicio Python | `pip-audit -r requirements.txt` | **Cualquier** vulnerabilidad conocida |

Notas sobre la política:

- Antes el umbral era `critical`, por lo que una vulnerabilidad alta (por ejemplo, un
  DoS explotable en un paquete de producción) no detenía el pipeline. Con `high`, una
  vulnerabilidad alta o crítica rompe el job y, por los `needs`, impide construir las
  imágenes y desplegar a staging.
- `--omit=dev` se mantiene: las dependencias de desarrollo (compiladores, linters,
  pruebas) no viajan a producción, así que no deben bloquear el despliegue. Sí
  conviene revisarlas con `npm audit` (sin la bandera) de vez en cuando.
- `pip-audit` no clasifica por severidad: falla ante cualquier vulnerabilidad conocida,
  tenga o no versión corregida. Es más estricto que la política de npm. Las versiones
  de `requirements.txt` están fijadas, por lo que el resultado es reproducible.
- Las vulnerabilidades de severidad moderada o baja no hacen fallar el job, pero siguen
  apareciendo en el reporte de `npm audit`.

### Cómo corregir un fallo

1. Reproducir en local: `npm audit --omit=dev --audit-level=high` (en `backend/` o
   `frontend/`) o `pip-audit -r requirements.txt` (en `python-service/`).
2. Aplicar solo actualizaciones compatibles: `npm audit fix` (sin `--force`) o subir la
   versión fijada en `requirements.txt`.
3. Si el arreglo exige un cambio incompatible (salto de versión mayor, otro paquete),
   no aplicarlo a ciegas: evaluar el riesgo y dejarlo documentado.
4. Volver a correr las pruebas del componente tocado antes de subir el cambio.

En Angular los paquetes `@angular/*` están fijados a una versión exacta y deben
actualizarse todos juntos al mismo minor; por eso `npm audit fix` no los toca y hay
que cambiarlos en `frontend/package.json`.

## 2. Estructura de la base reproducible solo con migraciones

### Contexto

En `backend/src/app.module.ts` la conexión se configura así:

- Desarrollo (`NODE_ENV` distinto de `production`): `synchronize: true`. TypeORM ajusta
  las tablas a las entidades al arrancar. Es cómodo para iterar en local.
- Producción (`NODE_ENV=production`): `synchronize: false` y `migrationsRun: true`. La
  única forma de cambiar la estructura es ejecutar las migraciones de
  `backend/src/migrations/`.

El riesgo de usar `synchronize` en desarrollo es que alguien cambie una entidad, vea que
todo funciona en su máquina y olvide escribir la migración. En producción faltaría esa
columna o tabla. La forma de evitarlo es comprobar automáticamente que las migraciones
reproducen por sí solas el modelo de entidades.

### La comprobación (job `migraciones` del CI)

El job `migraciones` hace lo siguiente sobre un PostgreSQL **recién creado y vacío**:

1. `npm ci` y `npm run build` (la CLI ejecuta las migraciones compiladas en `dist/`).
2. `npm run migration:run`: aplica **todas** las migraciones desde cero.
3. `npm run migration:show`: lista las migraciones aplicadas (queda en el log).
4. `npm run migration:check`: ejecuta `migration:generate --check`. TypeORM compara las
   entidades con la base ya migrada y termina con código 1 si faltaría alguna migración
   (no escribe ningún archivo).

Si falla el paso 2, alguna migración no es ejecutable desde cero (por ejemplo, depende de
datos o de una tabla que solo existía por `synchronize`). Si falla el paso 4, hay
**deriva**: entidades que cambiaron sin su migración.

El job usa el DataSource de la CLI (`backend/src/data-source.ts`), que tiene
`synchronize: false` fijo, así que `synchronize` nunca interviene en la comprobación.
`docker-images` y `deploy-staging` dependen de este job: sin migraciones completas no se
construye ni se despliega nada.

Qué verifica y qué no:

- Verifica que el esquema resultante de las migraciones coincide con las entidades
  (tablas, columnas, tipos, índices, claves foráneas, restricciones).
- No verifica datos, ni que el método `down` de cada migración funcione, ni cambios
  hechos a mano en una base ya existente.

### Crear una migración nueva (paso a paso, en local)

Importante: la migración se debe generar contra una base construida **solo con
migraciones**. Si se genera contra la base de desarrollo, que `synchronize` ya dejó al
día, TypeORM no ve diferencias y devuelve una migración vacía.

Requisitos: Docker Compose con la base arriba (`docker compose up -d database`, puerto
5433 del host) y las variables de conexión del `.env` de la raíz. Los comandos
siguientes son para bash; la contraseña se toma del `.env` y no se escribe en el
historial.

```bash
cd backend

# 1. Base temporal vacía (una por comprobación)
docker compose exec database psql -U menusmart -d postgres -c "CREATE DATABASE menusmart_migraciones;"

# 2. Variables de conexión hacia esa base
export DATABASE_HOST=localhost DATABASE_PORT=5433 DATABASE_USER=menusmart \
       DATABASE_NAME=menusmart_migraciones
export DATABASE_PASSWORD="$(grep '^DATABASE_PASSWORD=' ../.env | cut -d= -f2- | tr -d '\r')"

# 3. Dejar la base en el estado que tiene hoy el repositorio
npm run build
npm run migration:run

# 4. Generar la migración con la diferencia entre las entidades y esa base
npm run migration:generate -- src/migrations/NombreDelCambio
```

Revisar el archivo generado en `src/migrations/` (el nombre lleva el timestamp de
creación) y confirmar que solo contiene lo que se quiso cambiar. Luego repetir la
comprobación desde cero:

```bash
# 5. Base vacía de nuevo, todas las migraciones y comprobación de deriva
docker compose exec database psql -U menusmart -d postgres \
  -c "DROP DATABASE menusmart_migraciones;" -c "CREATE DATABASE menusmart_migraciones;"
npm run build
npm run migration:run
npm run migration:check     # debe decir: No changes in database schema were found

# 6. Limpiar
docker compose exec database psql -U menusmart -d postgres -c "DROP DATABASE menusmart_migraciones;"
```

En PowerShell las variables se definen con `$env:DATABASE_NAME = "..."` en lugar de
`export`.

Resumen de scripts (`backend/package.json`):

| Script | Qué hace |
| --- | --- |
| `npm run migration:generate -- src/migrations/Nombre` | Genera una migración con la diferencia entre entidades y base |
| `npm run migration:run` | Ejecuta las migraciones pendientes (usa `dist/`, requiere `npm run build`) |
| `npm run migration:show` | Muestra cuáles migraciones están aplicadas |
| `npm run migration:revert` | Revierte la última migración |
| `npm run migration:check` | Falla (código 1) si hay entidades sin migración; no escribe archivos |

Convención de nombres: el timestamp del archivo debe ser posterior al de la última
migración existente, para que el orden de ejecución sea el esperado.

### Por qué `synchronize` sigue activo en desarrollo

- Acelera la iteración local: se prueba un cambio de entidad sin escribir una migración
  por cada ajuste intermedio.
- No afecta lo entregado, por tres razones:
  1. **En producción está desactivado.** Las imágenes Docker fijan `NODE_ENV=production`
     (`backend/Dockerfile`, `docker-compose.yml`), por lo que el backend desplegado corre
     con `synchronize: false` y `migrationsRun: true`.
  2. **El CI no usa `synchronize` para validar la estructura.** El job `migraciones` parte
     de una base vacía y usa un DataSource con `synchronize: false`; si una entidad
     cambió sin migración, el job falla y el cambio no llega a las imágenes ni a staging.
  3. **Las migraciones se ejecutan desde cero en cada ejecución del pipeline**, de modo
     que la estructura final solo puede salir de ellas.
- Antes de abrir un pull request con cambios de entidades, correr la comprobación de la
  sección anterior (pasos 5 y 6). Es la misma que ejecuta el CI.

Limitación conocida: `synchronize` y las migraciones no pueden convivir en una misma
base (la primera crea las tablas y la migración inicial falla con "la tabla ya existe").
Por eso una base de desarrollo que ya pasó por `synchronize` no sirve para probar
migraciones: hay que usar una base vacía, como en el procedimiento anterior.
