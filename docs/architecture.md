# Arquitectura de MenuSmart

## 1. Diagrama de contexto

Quién usa el sistema y con qué sistemas externos interactúa.

```mermaid
flowchart TB
    Usuario["Usuario<br/>(estudiante, pareja o familia<br/>que planifica sus comidas)"]

    subgraph Sistema["MenuSmart"]
        App["Aplicación MenuSmart<br/>(web / PWA / Android)"]
    end

    Jumbo["Jumbo.cl<br/>(sitio externo)"]
    SantaIsabel["Santaisabel.cl<br/>(sitio externo)"]

    Usuario -->|"planifica comidas, genera lista de compras,<br/>compara precios"| App
    App -->|"obtiene precios de productos<br/>(scraping respetando robots.txt, ver ADR-002 y ADR-003)"| Jumbo
    App -->|"obtiene precios de productos<br/>(scraping respetando robots.txt, ver ADR-002 y ADR-003)"| SantaIsabel
```

## 2. Diagrama de contenedores

Los 4 servicios que componen el sistema y cómo se comunican.

```mermaid
flowchart TB
    Usuario["Usuario"]

    subgraph Frontend["Frontend"]
        Angular["Angular + Ionic + Capacitor<br/>(navegador, PWA, Android)"]
    end

    subgraph Backend["Backend"]
        Nest["NestJS<br/>API REST principal<br/>Auth JWT, validacion, orquestacion"]
    end

    subgraph PythonSvc["Servicio especializado"]
        FastAPI["Python + FastAPI<br/>Normalizacion de ingredientes<br/>y scraping de precios (ADR-002, ADR-003)"]
    end

    subgraph DB["Persistencia"]
        Postgres[("PostgreSQL")]
    end

    Usuario -->|HTTPS| Angular
    Angular -->|"REST /api/*<br/>(JWT en header Authorization)"| Nest
    Nest -->|"REST interno<br/>(timeout + manejo de indisponibilidad)"| FastAPI
    Nest -->|"TypeORM"| Postgres
    Nest -->|"GET /health<br/>(fuera del prefijo /api)"| Nest

    style Nest fill:#2b6cb0,color:#fff
    style FastAPI fill:#2f855a,color:#fff
    style Angular fill:#805ad5,color:#fff
    style Postgres fill:#4a5568,color:#fff
```

Reglas de comunicación (ver sección 3 del enunciado del curso):

- El frontend **nunca** llama directo al servicio Python ni a PostgreSQL: todo pasa por
  NestJS.
- El servicio Python **no tiene acceso a la base de datos**: normaliza ingredientes y extrae
  precios de las tiendas, y devuelve el resultado a NestJS, que lo valida y lo persiste (ver
  [ADR-004](adr/004-arquitectura-y-justificacion.md), decisiones 2 y 3).

## 3. Diagrama de despliegue

### Ambiente local (desarrollo, `docker-compose.yml`)

```mermaid
flowchart TB
    subgraph Host["Máquina de desarrollo (Docker Compose)"]
        subgraph FE["contenedor: frontend"]
            Nginx["nginx<br/>sirve build de Angular<br/>proxy /api/* -> backend"]
        end
        subgraph BE["contenedor: backend"]
            NestC["NestJS<br/>puerto 3000"]
        end
        subgraph PY["contenedor: python-service"]
            FastAPIC["FastAPI<br/>puerto 8000"]
        end
        subgraph DBC["contenedor: database"]
            PG["PostgreSQL 16<br/>puerto 5433 (host) -> 5432"]
        end
    end

    Navegador["Navegador del desarrollador<br/>localhost:8080"] --> Nginx
    Nginx -->|"http://backend:3000"| NestC
    NestC -->|"http://python-service:8000"| FastAPIC
    NestC -->|"host: database"| PG
```

### Ambiente de staging (Render, ver `infra/` y ADR-001)

```mermaid
flowchart TB
    subgraph Render["Render (staging)"]
        FrontendSvc["render_web_service: frontend<br/>publico"]
        BackendSvc["render_web_service: backend<br/>publico, /health"]
        PythonSvc["render_private_service: python-service<br/>SIN url publica"]
        PostgresSvc[("render_postgres<br/>plan free")]
    end

    Internet["Internet"] --> FrontendSvc
    Internet --> BackendSvc
    FrontendSvc -.->|"proxy /api/ a BACKEND_URL<br/>(URL publica del backend)"| BackendSvc
    BackendSvc -->|"DATABASE_URL"| PostgresSvc
    BackendSvc -->|"PYTHON_SERVICE_URL"| PythonSvc
```

> **Nota:** el despliegue en Render todavía no se ha ejecutado (`terraform apply`
> pendiente, requiere una cuenta real). Este diagrama refleja lo que `terraform plan`
> generaría, no un ambiente ya corriendo.
