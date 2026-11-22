# Accesibilidad

Auditoría automática realizada el 22-11-2026 sobre la rama de integración, con datos reales cargados y la app corriendo contra el backend local.

## Método

- **Herramienta:** axe-core 4.14.1, inyectado en cada pantalla ya cargada (espera de 6 segundos para que termine la animación de la transición entre páginas).
- **Reglas:** etiquetas `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa` (WCAG 2.0 y 2.1, niveles A y AA).
- **Pantallas:** login, registro, plan semanal, agregar comida, detalle de comida, sugerencias, lista de compras, comparador y perfil.
- **Formatos:** escritorio (1280 px) y móvil (390 px de ancho), porque la app tiene un diseño distinto para cada uno.
- **Usuario de prueba con datos:** 2 comidas, una lista de compras generada, precios reales del comparador y sugerencias del recomendador, para auditar las pantallas con contenido y no vacías.

## Resultado

Sin infracciones en las 9 pantallas, en escritorio y en móvil, con la salvedad de las limitaciones de abajo. Lo que encontró la primera pasada y se corrigió:

| Hallazgo (regla de axe) | Dónde | Corrección |
|---|---|---|
| Zoom bloqueado (`meta-viewport`) | Todas | Se quitó `user-scalable=no` y `maximum-scale` del viewport |
| Contraste insuficiente del texto secundario (`color-contrast`, 3,2:1) | Subtítulos, textos de ayuda, etiquetas de pestañas, precios en la boleta, estados | Nuevo color `--ms-texto-suave` (#5b6075, más de 6:1 sobre blanco y 5:1 sobre el papel); el gris lápiz queda solo para bordes y detalles |
| Contraste insuficiente del rojo de error y de peligro | Botón de cerrar sesión, mensajes de error | Rojo de peligro más oscuro (#b23a2b) para texto y botones; el rojo claro del margen de la libreta queda como decoración |
| Contraste del sello verde por transparencia | Boleta del comparador | Sello sin transparencia en esos dos casos |
| Íconos sin texto alternativo (`role-img-alt`) | 25 íconos decorativos | `aria-hidden="true"`: el texto o la etiqueta del botón ya dice lo mismo |
| Casillas sin nombre (`aria-toggle-field-name`) | Lista de compras en móvil | `aria-label` con el nombre del producto |
| Botones sin nombre (`button-name`) | Botones de foto y de quitar ingrediente | `aria-label` ("Elegir una foto de la comida", "Quitar <ingrediente>", "Subir foto de la comida") |

Además, el shell de la app (rama PWA) ya tenía: `lang="es"`, título, landmarks, foco visible global, respeto de `prefers-reduced-motion` y un aviso `role="status"` cuando se pierde la conexión. La pantalla de sugerencias usa un interruptor con `role="switch"`, un control deslizante con `aria-valuetext`, botones con `aria-pressed`, `role="status"` y `role="alert"` para los avisos, y mueve el foco tras aceptar o descartar una receta.

## Cómo se repite

1. Levantar el backend, el servicio Python y el frontend (instrucciones en el README de la raíz).
2. Instalar axe-core en una carpeta aparte (`npm i axe-core`), servir `node_modules/axe-core/axe.min.js` con cualquier servidor estático e inyectarlo en cada página abierta con `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })` desde la consola del navegador.

## Limitaciones (importante)

- **Las pruebas automáticas detectan alrededor de un tercio de los problemas de accesibilidad.** Que axe no reporte nada no significa cumplimiento total de WCAG.
- **No se probó con un lector de pantalla real** (NVDA, VoiceOver, TalkBack). Los roles, etiquetas y el orden del foco se revisaron en el DOM.
- **No se hizo una prueba completa solo con teclado** de todos los flujos; en la pantalla de sugerencias sí se operaron todos los controles con teclado.
- **No se corrió Lighthouse** ni se midió en un dispositivo Android; el APK se compila en CI pero no se ha probado en un teléfono.
- **El contraste se evaluó solo en los estados que muestra cada pantalla durante la auditoría.** Estados poco frecuentes (por ejemplo errores de red en cada formulario) no se recorrieron todos.
- **Las fotos de las comidas** se muestran con el texto alternativo "Foto de la comida"; no describen su contenido.
- **Texto agrandado del sistema:** no se probó; solo se verificó que el zoom del navegador ya no esté bloqueado.
