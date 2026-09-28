# MenuSmart
Planificador de comidas y comparador de precios de supermercado (Angular/Ionic + NestJS + FastAPI + PostgreSQL)

## Prototipo (Figma)

- **[Prototipo navegable](https://www.figma.com/proto/wypZX6IwEnJy4xjiUCOl5E/MENUSMART---INGWEBAVANZADA?node-id=50-10692&p=f&viewport=-2178%2C207%2C0.74&t=fEgSVeStmNl4ZSWW-1&scaling=min-zoom&content-scaling=fixed&starting-point-node-id=50%3A10690&show-proto-sidebar=1&page-id=50%3A10462)**: se abre directo en modo presentación.
- **[Archivo de diseño](https://www.figma.com/design/wypZX6IwEnJy4xjiUCOl5E/MENUSMART---INGWEBAVANZADA?node-id=50-10462&t=5fPKDI8QO3YoJub2-1)**: contiene las páginas *Prototipo* y *Guía de estilo*.

### Cómo recorrerlo
- En el panel lateral izquierdo (**Flows**) se elige el flujo:
  - **MenuSmart · Mobile** (375×812): Splash → Login → Plan semanal, Detalle de comida, Lista de compras, Comparador de precios y Perfil (tabs inferiores).
  - **MenuSmart · Desktop** (1440×900): las mismas pantallas adaptadas, con menú lateral y el contenido distribuido en columnas.
- Se navega haciendo clic en botones, comidas, tabs y menú.

### Guía de estilo
La página **Guía de estilo** del archivo de diseño documenta la identidad visual (concepto *"Libreta y boleta"*): logo, paleta de colores, tipografías (Caveat + Space Mono), componentes, ilustraciones y animaciones.

## Layout adaptativo (mobile / desktop / tablet)

El frontend implementa un diseño **adaptable, no solo responsivo**: por debajo
de los 1024px de ancho cada pantalla renderiza su árbol de componentes mobile
(tabs inferiores, tarjetas apiladas) y por encima renderiza otro árbol de
componentes desktop (menú lateral fijo, contenido en columnas) — son dos
estructuras HTML distintas elegidas en tiempo real con
[`@angular/cdk/layout` `BreakpointObserver`](frontend/src/app/core/services/layout.service.ts)
(`LayoutService.esDesktop$`) y `@if`/`*ngIf` en cada template, no el mismo
markup reacomodado con `@media` queries.

Páginas con layout dual: Login, Registro, Plan semanal, Detalle de comida,
Lista de compras, Comparador de precios y Perfil (los shells de tabs también
alternan entre `ion-tab-bar` inferior y un `app-sidebar` lateral fijo). Cada
una sigue el diseño de las pantallas "D*" (desktop) del
[prototipo de Figma](#prototipo-figma).

**Regla de tablet**: no existe un tercer layout diseñado para tablet. El
corte es un único breakpoint de **ancho** (`(min-width: 1024px)`), no una
detección de "es tablet". Una tablet en vertical (~768–834px, ej. iPad) cae
bajo el corte y reutiliza el layout **mobile**; la misma tablet en horizontal
(~1024–1366px) supera el corte y reutiliza el layout **desktop**. Esto sigue
la práctica estándar de Material Design / Apple HIG (resolver tablet
reutilizando el layout de la orientación más cercana) y evita triplicar el
trabajo de diseño/mantenimiento.
