# Registro de participación

> **Estado:** actualizado el 22-11-2026. Los números salen de `git log` y son verificables. Las declaraciones de la sección 2 las hizo Jan y **deben ser confirmadas por Camila antes de la defensa**: el historial de git no puede demostrarlas. Las celdas marcadas **confirmar** las completa el equipo.

El enunciado pide registrar la participación de cada integrante (sección 24.3) y la distribución de responsabilidades en el repositorio (sección 19.1). Este documento reúne lo que el repositorio puede demostrar y deja explícito lo que no, para que quien lo lea no tenga que deducirlo.

## 1. Integrantes y responsabilidades acordadas

Tomado de la tabla del [README](../README.md):

| Integrante | Ámbitos principales |
|---|---|
| Jan Houter. ([@JanHH16](https://github.com/JanHH16)) | Backend (NestJS), persistencia de datos (PostgreSQL/TypeORM), recuperación de información web (servicio Python/FastAPI, scraping), DevOps e infraestructura (GitHub Actions, Docker, Terraform), documentación técnica |
| Camila Torres. [@camitwrs](https://github.com/camitwrs) | Frontend (Angular/Ionic), experiencia de usuario (layout adaptativo mobile/desktop, prototipo Figma), capacidad adaptativa o inteligente (diseño de la interacción y presentación al usuario), pruebas (cobertura del frontend), seguridad y calidad de código (revisión) |

## 2. Declaraciones del equipo (a confirmar)

Estas declaraciones se incluyen para que la información no quede oculta. Son **declaradas por Jan y no verificables desde git**.

1. **Cuenta de git compartida.** Camila tuvo problemas con su equipo anterior y se incorporó a este proyecto. Parte del trabajo se subió desde la cuenta de Jan, por lo que el conteo de commits por autor **no refleja con exactitud quién hizo cada cambio**. Los 24 commits de septiembre con el nombre de Camila sí están a su nombre.
2. **Validación.** Según Jan, Camila revisó y validó el trabajo del proyecto. Evidencia disponible: confirmar si existen comentarios en las pull requests de GitHub, conversaciones o notas que lo respalden y enlazarlas aquí.
3. **Uso de asistencia de IA.** Ver la sección 6.
4. **Cronología.** Hubo una pausa entre la EP1 (septiembre) y el trabajo de esta etapa (noviembre). La EP2 estaba prevista para el 19 de octubre y se entregó con retraso, por lo que el desarrollo de la EP2 y de la Entrega Final se concentró en los días 21 y 22 de noviembre. El enunciado considera insuficiente "realizar todos los commits inmediatamente antes de una entrega"; reconocemos que el historial presenta esa concentración y la explicamos aquí.

Confirmaciones pendientes: **Camila** confirma los puntos 1 y 2; **ambos** confirman con la profesora la política de uso de IA y que la forma de participación descrita es aceptable.

## 3. Commits por autor

Comando (bash o PowerShell, desde la raíz del repositorio):

```bash
git log origin/develop --no-merges --format='%an|%ad|%s' --date=short
```

Datos al 22-11-2026, sobre `develop` y sin contar commits de unión (**103 commits**):

| Autor (nombre en git) | Commits | Días con actividad | Primer commit | Último commit |
|---|---|---|---|---|
| Jan | 79 | 6 | 2026-09-25 | 2026-11-22 |
| Camila Torres | 24 | 3 | 2026-09-26 | 2026-09-28 |

Los commits de Jan incluyen el trabajo escrito con asistencia de IA y, según la declaración 1, parte del trabajo de Camila (ver secciones 2 y 6).

### Por mes

| Autor | Septiembre 2026 | Noviembre 2026 |
|---|---|---|
| Jan | 25 | 54 |
| Camila Torres | 24 | 0 |

De los 54 commits de noviembre, 3 son del 21 y 51 del 22.

### Por área del repositorio

Cada commit cuenta en todas las áreas que toca, así que las filas no suman el total.

| Área | Jan | Camila Torres |
|---|---|---|
| Backend (`backend/`) | 35 | 0 |
| Servicio Python (`python-service/`) | 17 | 0 |
| Frontend (`frontend/`, sin Android) | 25 | 19 |
| Android (`frontend/android/`) | 1 | 0 |
| CI/CD y Docker (`.github/`, `Dockerfile`, `docker-compose.yml`) | 12 | 0 |
| Infraestructura (`infra/`) | 3 | 0 |
| Documentación (`docs/`, archivos `.md`) | 29 | 5 |
| Otros (configuración, `.gitignore`, ejemplos de entorno) | 10 | 1 |

### Por tipo de cambio

| Tipo (prefijo del mensaje) | Jan | Camila Torres |
|---|---|---|
| `feat` | 26 | 14 |
| `fix` | 22 | 1 |
| `docs` | 18 | 4 |
| `ci` | 4 | 0 |
| `test`, `refactor`, `chore`, `style` | 6 | 4 |
| Sin prefijo convencional | 3 | 1 |

### Pull requests

El repositorio registra 19 pull requests unidos (la numeración llega a 22 y se comparte con issues). Quién ejecutó cada unión:

| Quien unió | Pull requests |
|---|---|
| Camila Torres | #1, #3, #5, #6, #9, #11, #12, #13, #15, #16 |
| Jan | #2, #4, #10, #17, #19, #20, #21, #22 |
| Automático | #18 (GitHub la marcó como unida al llevar `develop` los mismos commits en la #19) |

Esto muestra quién ejecutó la unión, no necesariamente quién revisó el código. Las uniones #19 a #22 se hicieron con la cuenta de Jan desde su navegador por instrucción suya, con apoyo del asistente de IA (ver sección 6). Si hubo revisión en los comentarios de las pull requests, esa evidencia está en GitHub y se puede enlazar aquí: **confirmar**.

### Lo que el historial no puede mostrar

- Diseño (el prototipo de Figma y la guía de estilo no viven en git).
- Revisión de código, decisiones tomadas en reuniones y pruebas manuales.
- Quién escribió realmente cada cambio hecho desde la cuenta compartida (declaración 1) o con asistencia de IA.
- La importancia relativa de cada commit (un commit grande y uno chico cuentan igual).

## 4. Contribuciones por integrante

Cada integrante debe poder explicar con sus palabras lo que figura aquí, para la defensa individual. La guía [guia-estudio-defensa.md](guia-estudio-defensa.md) tiene el material de estudio por componente.

| Ámbito | Integrante responsable | Evidencia en el repositorio | Confirmar |
|---|---|---|---|
| Frontend (Angular/Ionic) | Camila (septiembre) y Jan, con asistencia de IA (noviembre) | `frontend/`; commits con prefijo `feat(frontend)` | confirmar |
| Experiencia de usuario y prototipo Figma | Camila (según el README) | Enlace del prototipo en el [README](../README.md#prototipo-figma) | confirmar |
| Diseño de la interacción de la capacidad adaptativa | Camila (según el README) y Jan | [capacidad-adaptativa.md](capacidad-adaptativa.md), pantalla de sugerencias | confirmar |
| Backend (NestJS) | Jan, con asistencia de IA | `backend/` | confirmar |
| Persistencia (PostgreSQL, migraciones) | Jan, con asistencia de IA | `backend/src/migrations/`, [database.md](database.md) | confirmar |
| Recuperación de información web (scraping) | Jan, con asistencia de IA | `python-service/app/scrapers/`, [ADR-002](adr/002-fuentes-datos-web.md), [ADR-003](adr/003-metodo-scraping.md) | confirmar |
| Procesamiento (normalización de ingredientes) | Jan, con asistencia de IA | `python-service/app/normalizacion.py`, [documento](normalizacion-de-ingredientes.md) | confirmar |
| Recomendador | Jan, con asistencia de IA | `backend/src/recommendations/`, [ADR-005](adr/005-recomendador-adaptativo.md) | confirmar |
| Pruebas | Jan, con asistencia de IA | `*.spec.ts`, `backend/test/`, `python-service/tests/` | confirmar |
| Seguridad y revisión de calidad de código | Jan, con asistencia de IA; revisión: Camila (según la declaración 2) | `docs/seguridad-privacidad-etica.md`, `.github/workflows/` | confirmar |
| DevOps (CI/CD, Docker, Terraform, staging en Render) | Jan, con asistencia de IA | `.github/workflows/`, `docker-compose.yml`, `infra/` | confirmar |
| Documentación y ADR | Jan, con asistencia de IA | `docs/` | confirmar |
| Gestión del proyecto (tablero) | confirmar | Enlace al tablero: pendiente | confirmar |

## 5. Colaboración y proceso de Git

- **Ramas por funcionalidad** (`feature/...`) y unión mediante pull requests a `develop`; `main` recibe las entregas (el tag `v1.0.0-ep1` corresponde a la EP1; los de la EP2 y la Entrega Final se crean al cerrar la entrega).
- **Conventional Commits** en español (`tipo(alcance): resumen`).
- Para la EP2 y la EF el trabajo se organizó en ramas por tema (`feature/core-domain`, `feature/observability`, `feature/seguridad`, `feature/ci-auditoria`, `feature/pipeline-staging`, `feature/pwa-android`, `feature/docs-ep2`) integradas en `integration/ep2-ef` y unidas a `develop` en la PR #19. Luego, la #20 (staging en plan gratuito), la #21 (`develop` a `main`) y la #22 (documentación).
- Protección de ramas y revisores obligatorios: **no verificable desde el repositorio** (se configura en GitHub; ver [checklist-entrega.md](checklist-entrega.md)).

## 6. Uso de asistencia de IA

El desarrollo de la EP2 y de la Entrega Final se hizo con asistencia de **Claude (Anthropic)**, un asistente de IA, bajo la dirección de Jan:

- **Qué decidió Jan:** el alcance, las prioridades y el criterio de aceptación; qué se hace y qué no; la elección de usar el plan gratuito de Render y sus consecuencias; las autorizaciones de cada unión de ramas.
- **Qué hizo el asistente:** escribió y modificó código, pruebas y documentación; ejecutó pruebas y comprobaciones; creó y unió pull requests, ejecutó `terraform apply` y operó el despliegue y el rollback en staging por instrucción de Jan; y preparó los datos de demostración del staging.
- **Revisión:** Jan revisa y aprueba los cambios antes de que queden en el repositorio. Según la declaración 2, Camila también los revisó y validó.
- **Autoría en git:** por indicación de Jan, los commits salen con su identidad y **sin línea de coautor**. Por eso el conteo de commits por autor de la sección 3 **no distingue** el trabajo escrito con asistencia del escrito a mano. Esta sección existe para que esa información no quede oculta.
- **Verificación:** los resultados citados en la documentación (métricas, pruebas, ejemplos) se obtuvieron ejecutando el código, y las limitaciones se declaran donde no se pudo verificar algo. Aun así, el asistente puede equivocarse (durante el trabajo se detectaron y corrigieron errores, por ejemplo en el CI y en cifras de la documentación). Cada integrante es responsable de entender y poder explicar lo que está en el repositorio, sea quien sea que lo haya escrito.

Confirmar con la profesora la política de uso de IA de la asignatura y ajustar esta sección si corresponde: **confirmar**.

## 7. Cómo mantener este registro

Actualizar los números con el comando de la sección 3 antes de cada entrega, completar las celdas **confirmar** y enlazar evidencias concretas (pull requests, issues, tablero) en lugar de afirmaciones generales.
