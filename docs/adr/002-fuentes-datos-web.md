# ADR-002: Fuentes de información web (precios de supermercado)

**Estado:** Aceptado
**Fecha:** 2026-08-29 (investigación inicial)

## Contexto

El proyecto exige obtener información desde al menos una fuente web externa mediante
scraping "autorizado" (secciones 18 y 27 del enunciado del curso: respetar `robots.txt`,
términos de servicio, privacidad y límites de solicitudes). Se evaluaron los 4
supermercados chilenos más relevantes: Jumbo, Santa Isabel, Líder y Unimarc.

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
- **Unimarc.cl**: no tiene `robots.txt` (404 en `www.unimarc.cl` y `unimarc.cl`). Sin
  restricciones declaradas, pero también sin la misma solidez para documentar en el ADR
  que Jumbo/Santa Isabel. Se deja como fuente **opcional de tercera prioridad**, no
  bloqueante para EP1/EP2.

Se probó además si Jumbo exponía una API pública tipo VTEX
(`/api/catalog_system/pub/products/search`) para evitar scraping de HTML. Respondió
404, no es una vía confiable. No existe una API oficial/abierta de precios en tiempo
real por supermercado en Chile (ODEPA/datos.gob.cl solo tiene promedios agregados de
canasta básica por región, no sirve para comparar por SKU entre cadenas).

## Decisión

Usar **web scraping de Jumbo + Santa Isabel** como fuentes principales (mismo grupo
Cencosud, misma estructura de plataforma → el scraper en Python puede reutilizar casi
toda la lógica de parsing entre ambos). Unimarc queda como fuente opcional si el tiempo
lo permite. Líder queda descartado del proyecto.

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
