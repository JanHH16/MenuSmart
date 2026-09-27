# MenuSmart

Planificador de comidas y comparador de precios de supermercado, para estudiantes,
parejas o familias que quieren organizar mejor su alimentación y su presupuesto.

**Stack:** Angular + Ionic + Capacitor · NestJS · Python + FastAPI · PostgreSQL · Docker ·
GitHub Actions · Terraform

## Integrantes y responsabilidades

| Integrante | Ámbitos principales |
|---|---|
| Jan H. ([@JanHH16](https://github.com/JanHH16)) | Backend (NestJS), servicio Python, persistencia, DevOps/CI-CD, infraestructura (Terraform), documentación técnica |
| [@camitwrs](https://github.com/camitwrs) | Frontend (diseño de vistas), prototipo Figma, revisión de código (seguridad, calidad, cobertura de pruebas) |

## Problema y usuarios objetivo

Planificar comidas y hacer las compras de supermercado consume tiempo y suele hacerse
desorganizado: sin lista clara, repitiendo ingredientes innecesariamente, o sin comparar
precios entre supermercados por falta de tiempo o de información centralizada, lo que
genera sobregasto y desperdicio de comida.

MenuSmart está pensado para estudiantes, parejas o familias que cocinan regularmente y
gestionan su propio presupuesto de alimentación.

## Objetivos

- Permitir planificar un plan de comidas semanal.
- Generar automáticamente una lista de compras consolidada (sin ingredientes duplicados
  entre comidas).
- Comparar precios de productos entre supermercados chilenos (Jumbo y Santa Isabel) para
  recomendar dónde comprar cada uno.

## Alcance y exclusiones

**Dentro del alcance de esta entrega:** autenticación de usuarios, esqueleto de
navegación completo (login, registro, plan semanal, lista de compras, comparador),
comunicación real entre los 4 servicios, contenerización completa, pipeline DevSecOps,
infraestructura preliminar como código.

**Fuera del alcance de esta entrega** (ver [Limitaciones conocidas](#limitaciones-conocidas)):
scraping real de precios, persistencia de comidas/ingredientes/listas de compra, diseño
visual final de las vistas, despliegue real en staging.

## Principales funcionalidades

- Registro e inicio de sesión (JWT).
- Navegación entre Plan semanal, Lista de compras y Comparador de precios.
- Servicio Python que normaliza y consolida ingredientes duplicados (base de la futura
  lista de compras automática).
- Health check que verifica en tiempo real la conexión a PostgreSQL y al servicio Python.

## Capacidad adaptativa o inteligente

**Diseño (implementación completa planeada para EP2/EF, ver ADR-002):** el sistema
combinará dos mecanismos:

1. **Recomendación de comidas** según el historial y preferencias del usuario.
2. **Optimización de compra**: dado un plan semanal, decidir en qué supermercado
   (Jumbo o Santa Isabel) conviene comprar cada producto para minimizar el costo total.

Lo ya implementado hoy, la normalización/consolidación de ingredientes duplicados en el
servicio Python (`POST /ingredients/normalize`), es la base de datos limpia sobre la que
se construirán ambos mecanismos.

## Arquitectura

Ver [`docs/architecture.md`](docs/architecture.md) para los diagramas de contexto,
contenedores y despliegue, y [`docs/database.md`](docs/database.md) para el modelo de
datos. Decisiones clave documentadas como ADR en [`docs/adr/`](docs/adr/):

- [ADR-001: Infraestructura con Terraform + Render](docs/adr/001-infraestructura-render.md)
- [ADR-002: Fuentes de información web](docs/adr/002-fuentes-datos-web.md)

## Fuente de información web

Jumbo y Santa Isabel (mismo grupo Cencosud). Ver [ADR-002](docs/adr/002-fuentes-datos-web.md)
para el análisis completo de `robots.txt` y por qué se descartó Líder.

## Prototipo (Figma)

- **[Prototipo navegable](https://www.figma.com/proto/wypZX6IwEnJy4xjiUCOl5E/Sin-t%C3%ADtulo?page-id=10%3A1925&node-id=10-2153&p=f&viewport=40%2C471%2C0.18&t=e7RTlnrJyM8nR1wG-1&scaling=min-zoom&content-scaling=fixed&starting-point-node-id=10%3A2153&show-proto-sidebar=1)**: se abre directo en modo presentación.
- **[Archivo de diseño](https://www.figma.com/design/wypZX6IwEnJy4xjiUCOl5E/Sin-t%C3%ADtulo?node-id=10-1925&t=Pys4SupOgEKHQ7cv-1)**: contiene las páginas *Prototipo* y *Guía de estilo*.

### Cómo recorrerlo
- En el panel lateral izquierdo (**Flows**) se elige el flujo:
  - **MenuSmart · Mobile** (375×812): Splash → Login → Plan semanal, Detalle de comida, Lista de compras, Comparador de precios y Perfil (tabs inferiores).
  - **MenuSmart · Desktop** (1440×900): las mismas pantallas adaptadas, con menú lateral y el contenido distribuido en columnas.
- Se navega haciendo clic en botones, comidas, tabs y menú.

### Guía de estilo
La página **Guía de estilo** del archivo de diseño documenta la identidad visual (concepto *"Libreta y boleta"*): logo, paleta de colores, tipografías (Caveat + Space Mono), componentes, ilustraciones y animaciones.

## Instalación y ejecución (con Docker, recomendado)

Requiere Docker Desktop instalado y corriendo.

```bash
cp .env.example .env
```

Completa `.env` con valores propios (especialmente `JWT_SECRET`, cualquier valor de
desarrollo sirve).

```bash
docker compose up --build
```

Esto levanta los 4 servicios: PostgreSQL (con la migración inicial corriendo sola),
FastAPI, NestJS (con `/health` verificando sus dependencias) y el frontend servido por
nginx con proxy a la API.

| Servicio | URL local |
|---|---|
| Frontend | http://localhost:8080 |
| Backend (API) | http://localhost:3000/api |
| Backend (health) | http://localhost:3000/health |
| Servicio Python | http://localhost:8000 |

## Variables de entorno

Cada servicio tiene su propio `.env.example`: [`backend/.env.example`](backend/.env.example),
[`python-service/.env.example`](python-service/.env.example), y el de la raíz
[`.env.example`](.env.example) para Docker Compose. Nunca commitear un `.env` real
(ya están excluidos en `.gitignore`).

## Desarrollo local sin Docker

Ver instrucciones específicas en [`backend/README.md`](backend/README.md) (NestJS) y
correr `npm install && ionic serve` dentro de `frontend/` para el frontend. El servicio
Python usa un entorno virtual (`python -m venv venv`) y
`pip install -r requirements-dev.txt`.

## Pruebas

```bash
# Backend: unitarias + e2e
cd backend && npm run test && npm run test:e2e

# Frontend: unitarias
cd frontend && npx ng test --watch=false

# Servicio Python
cd python-service && pytest
```

Las mismas pruebas (más lint, análisis de seguridad y escaneo de imágenes Docker) corren
automáticamente en cada push/PR. Ver `.github/workflows/ci.yml`.

## Infraestructura y despliegue

La infraestructura de staging está definida como código en [`infra/`](infra/) (Terraform,
proveedor Render). Ver [ADR-001](docs/adr/001-infraestructura-render.md) para el
detalle de la decisión.

```bash
cd infra
terraform init
terraform validate
terraform plan
```

**Estado del despliegue:** `terraform apply` todavía no se ha ejecutado (requiere una
cuenta real de Render). El ambiente de staging en vivo queda pendiente, ver
[Limitaciones conocidas](#limitaciones-conocidas).

## Documentación de la API

Pendiente integrar Swagger/OpenAPI (ver Trabajo futuro). Mientras tanto, los endpoints
disponibles son:

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/health` | Estado del backend, PostgreSQL y servicio Python | No |
| POST | `/api/auth/register` | Registro de usuario | No |
| POST | `/api/auth/login` | Inicio de sesión, devuelve JWT | No |
| POST | `/api/ingredients/normalize` | Consolida ingredientes duplicados | Sí (Bearer) |
| GET | `/health` (servicio Python) | Estado del servicio Python | No |
| POST | `/ingredients/normalize` (servicio Python) | Normalización real (llamado internamente por NestJS) | No (uso interno) |

## Limitaciones conocidas

- El scraping real de precios (Jumbo/Santa Isabel) todavía no está implementado: el
  servicio Python solo tiene el endpoint de normalización de ingredientes.
- Las vistas de Plan semanal, Lista de compras y Comparador son placeholders funcionales
  (navegación y lógica real, diseño visual pendiente según Figma).
- No hay persistencia todavía de Comidas, Ingredientes, Listas de compra ni Precios (solo
  `users`). Ver [`docs/database.md`](docs/database.md).
- El despliegue en Render no se ha ejecutado; `frontend/nginx.conf` resuelve el backend
  como `http://backend:3000` (nombre de Docker Compose), que no aplica igual en Render.
  Ver ADR-001.
- No hay documentación OpenAPI/Swagger generada todavía.
- La app Android (Capacitor) tiene la configuración inicial, pero no se ha generado el
  proyecto nativo ni probado en un dispositivo/emulador.

## Trabajo futuro

- Implementar el scraping de Jumbo y Santa Isabel (ADR-002) y las entidades de dominio
  (Comida, Ingrediente, ListaCompra, Producto, PrecioSupermercado).
- Implementar la capacidad adaptativa completa (recomendación + optimización de compra).
- Generar el proyecto Android con Capacitor y probarlo en un dispositivo real.
- Documentación OpenAPI/Swagger del backend.
- Ejecutar `terraform apply` contra una cuenta real de Render y resolver el enrutamiento
  frontend → backend en ese ambiente.
- Diseño visual final de las vistas según el prototipo Figma.

## Licencia

Proyecto académico, desarrollado para la asignatura Ingeniería Web Avanzada. Sin licencia
de uso público definida.
