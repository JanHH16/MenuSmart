# ADR-002: Fuentes de información web (precios de supermercado)

**Estado:** Aceptado
**Fecha:** 2026-08-29 (investigación inicial)

## Contexto

El proyecto exige obtener información desde al menos una fuente web externa mediante
scraping "autorizado" (secciones 18 y 27 del enunciado del curso: respetar `robots.txt`,
términos de servicio, privacidad y límites de solicitudes). Se evaluaron los 5
supermercados chilenos más relevantes: Jumbo, Santa Isabel, Líder, Tottus y Unimarc.

## Investigación (`robots.txt` real de cada sitio)

- **Jumbo.cl**: no bloquea páginas de producto/categoría para bots genéricos (solo
  restringe carrito, cuenta, checkout, y bloquea algunos bots específicos por nombre,
  no `User-agent: *`). ✅ Usable.
- **Santaisabel.cl**: mismo patrón que Jumbo (ambos son del grupo Cencosud, misma
  plataforma). ✅ Usable.
- **Lider.cl**: bloquea explícitamente `Disallow: /catalogo/product*`,
  `/catalogo/category*`, `/supermercado/category*`, `/supermercado/product*`,
  `/supermercado*` para `User-agent: *`. ❌ **Descartado**: scrapearlo violaría
  directamente la pauta del curso.
- **Tottus.cl**: `robots.txt` para `User-agent: *` solo restringe `/cgi-bin/`,
  `/tottus-cl/basket*`, `/tottus-cl/myaccount*`, `/tottus-cl/checkout*` y
  `/tottus-cl/orders*` (carrito, cuenta, checkout, pedidos). No bloquea páginas de
  producto ni categoría. ✅ Usable, verificado el 28-09-2026 en
  `https://www.tottus.cl/robots.txt`. No se eligió como fuente principal porque es una
  plataforma distinta a la de Jumbo/Santa Isabel (Falabella/Tottus vs. VTEX de Cencosud),
  así que no comparte lógica de parsing con ellas: agregarla suma una tercera estructura
  de página que mantener sin aportar una tienda adicional al alcance definido para el
  comparador (Jumbo vs. Santa Isabel). Queda como candidata de expansión para EP2/EF si
  el tiempo lo permite, con la misma prioridad que Unimarc.
- **Unimarc.cl**: no tiene `robots.txt` (404 en `www.unimarc.cl` y `unimarc.cl`). Sin
  restricciones declaradas, pero también sin la misma solidez para documentar en el ADR
  que Jumbo/Santa Isabel/Tottus. Se deja como fuente **opcional de tercera prioridad**, no
  bloqueante para EP1/EP2.

Se probó además si Jumbo exponía una API pública tipo VTEX
(`/api/catalog_system/pub/products/search`) para evitar scraping de HTML. Respondió
404, no es una vía confiable. No existe una API oficial/abierta de precios en tiempo
real por supermercado en Chile (ODEPA/datos.gob.cl solo tiene promedios agregados de
canasta básica por región, no sirve para comparar por SKU entre cadenas).

## Decisión

Usar **web scraping de Jumbo + Santa Isabel** como fuentes principales (mismo grupo
Cencosud, misma estructura de plataforma → el scraper en Python puede reutilizar casi
toda la lógica de parsing entre ambos). Tottus y Unimarc quedan como fuentes opcionales
de expansión si el tiempo lo permite (ambas son técnicamente usables según su
`robots.txt`, pero suman una plataforma distinta que no comparte lógica de parsing con
Jumbo/Santa Isabel). Líder queda descartado del proyecto.

## Consecuencias

- El módulo de scraping en el servicio Python debe respetar rate-limiting razonable y
  extraer solo páginas de categoría/producto (nunca carrito, cuenta ni checkout).
- Al tener 2 fuentes con la misma plataforma, la comparación de precios del comparador
  es directa (mismo formato de página, mismo tipo de identificador de producto).
- Si Jumbo o Santa Isabel cambian su `robots.txt` o estructura HTML durante el semestre,
  este ADR debe revisarse: el scraper es frágil a cambios de estructura de página.
- **Pendiente de implementación (Fase 6 / EP2):** el módulo de scraping en sí todavía no
  existe en `python-service/`; hoy el servicio Python solo tiene el endpoint de
  normalización de ingredientes. Este ADR fija la decisión antes de construirlo.
