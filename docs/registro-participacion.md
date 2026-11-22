# Registro de participación

> **BORRADOR a confirmar por Jan.** Los números salen de `git log` y son verificables. Las celdas marcadas **confirmar** las debe completar el equipo: el historial de git no dice quién diseñó, revisó o decidió cada cosa.

El enunciado pide registrar la participación de cada integrante (sección 24.3) y la distribución de responsabilidades en el repositorio (sección 19.1). Este documento reúne lo que el repositorio puede demostrar y deja explícito lo que no.

## 1. Integrantes y responsabilidades acordadas

Tomado de la tabla del [README](../README.md):

| Integrante | Ámbitos principales |
|---|---|
| Jan Houter. ([@JanHH16](https://github.com/JanHH16)) | Backend (NestJS), persistencia de datos (PostgreSQL/TypeORM), recuperación de información web (servicio Python/FastAPI, scraping), DevOps e infraestructura (GitHub Actions, Docker, Terraform), documentación técnica |
| Camila Torres. [@camitwrs](https://github.com/camitwrs) | Frontend (Angular/Ionic), experiencia de usuario (layout adaptativo mobile/desktop, prototipo Figma), capacidad adaptativa o inteligente (diseño de la interacción y presentación al usuario), pruebas (cobertura del frontend), seguridad y calidad de código (revisión) |

## 2. Commits por autor

Comando (bash o PowerShell, desde la raíz del repositorio):

```bash
git log --all --no-merges --format='%an|%ad|%s' --date=short
```

Datos al 22-11-2026, sobre todas las ramas locales y sin contar commits de unión (87 commits):

| Autor (nombre en git) | Commits | Días con actividad | Primer commit | Último commit |
|---|---|---|---|---|
| Jan | 63 | 6 | 2026-09-25 | 2026-11-22 |
| Camila Torres | 24 | 3 | 2026-09-26 | 2026-09-28 |

Los commits de esta rama de documentación se cuentan dentro de los de Jan, porque salen con su identidad (ver la sección 5).

### Por mes

| Autor | Septiembre 2026 | Noviembre 2026 |
|---|---|---|
| Jan | 25 | 38 |
| Camila Torres | 24 | 0 |

### Por área del repositorio

Cada commit cuenta en todas las áreas que toca, así que las filas no suman el total.

| Área | Jan | Camila Torres |
|---|---|---|
| Backend (`backend/`) | 30 | 0 |
| Servicio Python (`python-service/`) | 13 | 0 |
| Frontend (`frontend/`, sin Android) | 23 | 19 |
| Android (`frontend/android/`) | 1 | 0 |
| CI/CD y Docker (`.github/`, `Dockerfile`, `docker-compose.yml`) | 10 | 0 |
| Infraestructura (`infra/`) | 2 | 0 |
| Documentación (`docs/`, archivos `.md`) | 20 | 5 |
| Otros (configuración, `.gitignore`, ejemplos de entorno) | 7 | 1 |

### Por tipo de cambio

| Tipo (prefijo del mensaje) | Jan | Camila Torres |
|---|---|---|
| `feat` | 25 | 14 |
| `fix` | 17 | 1 |
| `docs` | 11 | 4 |
| `ci` | 4 | 0 |
| `chore`, `style`, `refactor`, `test` | 3 | 4 |
| Sin prefijo convencional | 3 | 1 |

### Pull requests

El repositorio registra 14 pull requests unidos (números 1 a 17; el #17 llevó `develop` a `main`). Quién ejecutó cada unión:

| Quien unió | Pull requests |
|---|---|
| Camila Torres | #1, #3, #5, #6, #9, #11, #12, #13, #15, #16 |
| Jan | #2, #4, #10, #17 |

Esto muestra quién hizo el clic de unir, no necesariamente quién revisó el código. Si hubo revisión en los comentarios de los pull requests, esa evidencia está en GitHub y se puede enlazar aquí: **confirmar**.

### Lo que el historial no puede mostrar

- Diseño (el prototipo de Figma y la guía de estilo no viven en git).
- Revisión de código, decisiones tomadas en reuniones y pruebas manuales.
- Trabajo hecho en ramas que aún no están en el repositorio remoto, o con otra identidad de git.
- La importancia relativa de cada commit (un commit grande y uno chico cuentan igual).

## 3. Contribuciones por integrante (a completar)

Cada integrante debe poder explicar con sus palabras lo que figura aquí, para la defensa individual. Las celdas marcadas **confirmar** son para que el equipo las complete.

| Ámbito | Integrante responsable | Evidencia en el repositorio | Confirmar |
|---|---|---|---|
| Frontend (Angular/Ionic) | confirmar | `frontend/`; commits con prefijo `feat(frontend)` | confirmar |
| Experiencia de usuario y prototipo Figma | confirmar | Enlace del prototipo en el [README](../README.md#prototipo-figma) | confirmar |
| Diseño de la interacción de la capacidad adaptativa | confirmar | [capacidad-adaptativa.md](capacidad-adaptativa.md), pantalla de sugerencias | confirmar |
| Backend (NestJS) | confirmar | `backend/` | confirmar |
| Persistencia (PostgreSQL, migraciones) | confirmar | `backend/src/migrations/`, [database.md](database.md) | confirmar |
| Recuperación de información web (scraping) | confirmar | `python-service/app/scrapers/`, [ADR-002](adr/002-fuentes-datos-web.md), [ADR-003](adr/003-metodo-scraping.md) | confirmar |
| Procesamiento (normalización de ingredientes) | confirmar | `python-service/app/normalizacion.py`, [documento](normalizacion-de-ingredientes.md) | confirmar |
| Recomendador | confirmar | `backend/src/recommendations/`, [ADR-005](adr/005-recomendador-adaptativo.md) | confirmar |
| Pruebas | confirmar | `*.spec.ts`, `backend/test/`, `python-service/tests/` | confirmar |
| Seguridad y revisión de calidad de código | confirmar | Rama `feature/seguridad` y [seguridad-privacidad-etica.md](seguridad-privacidad-etica.md) | confirmar |
| DevOps (CI/CD, Docker, Terraform) | confirmar | `.github/workflows/`, `docker-compose.yml`, `infra/` | confirmar |
| Documentación y ADR | confirmar | `docs/` | confirmar |
| Gestión del proyecto (tablero) | confirmar | Enlace al tablero: pendiente | confirmar |

## 4. Colaboración y proceso de Git

- **Ramas por funcionalidad** (`feature/...`) y unión mediante pull requests a `develop`; `main` recibe las entregas (el tag `v1.0.0-ep1` corresponde a la EP1).
- **Conventional Commits** en español (`tipo(alcance): resumen`).
- Para la EP2 y la EF el trabajo se organizó en ramas por tema (`feature/core-domain`, `feature/observability`, `feature/seguridad`, `feature/ci-auditoria`, `feature/pipeline-staging`, `feature/pwa-android`, `feature/docs-ep2`) que se unen en `integration/ep2-ef`.
- Protección de ramas y revisores obligatorios: **no verificable desde el repositorio** (se configura en GitHub; ver [checklist-entrega.md](checklist-entrega.md)).

## 5. Uso de asistencia de IA

El desarrollo de la EP2 y de la Entrega Final se hizo con asistencia de **Claude (Anthropic)**, un asistente de IA, bajo la dirección de Jan:

- **Qué decidió Jan:** el alcance, las prioridades y el criterio de aceptación; qué se hace y qué no.
- **Qué hizo el asistente:** escribió y modificó código, pruebas y documentación, ejecutó pruebas y comprobaciones, y propuso alternativas, siempre a partir de las instrucciones de Jan.
- **Revisión:** Jan revisa y aprueba cada cambio antes de que quede en el repositorio.
- **Autoría en git:** por indicación de Jan, los commits salen con su identidad y **sin línea de coautor**. Por eso el conteo de commits por autor de la sección 2 **no distingue** el trabajo escrito con asistencia del escrito a mano. Esta sección existe para que esa información no quede oculta.
- **Verificación:** los resultados citados en la documentación (métricas, pruebas, ejemplos) se obtuvieron ejecutando el código, y las limitaciones se declaran donde no se pudo verificar algo. Aun así, el asistente puede equivocarse; cada integrante es responsable de entender y poder explicar lo que está en el repositorio, sea quien sea que lo haya escrito.

Confirmar con la profesora la política de uso de IA de la asignatura y ajustar esta sección si corresponde: **confirmar**.

## 6. Cómo mantener este registro

Actualizar los números con el comando de la sección 2 antes de cada entrega, completar las celdas **confirmar** y enlazar evidencias concretas (pull requests, issues, tablero) en lugar de afirmaciones generales.
