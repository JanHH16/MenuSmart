# ADR-003: Método de obtención de precios (JSON-LD de la búsqueda)

**Estado:** Aceptado
**Fecha:** 2026-11-21

## Contexto

La EP2 exige extracción automatizada, validada y trazable desde una fuente web. El
[ADR-002](002-fuentes-datos-web.md) fijó las fuentes (Jumbo y Santa Isabel) pero no el
método. La API pública tipo VTEX ya había respondido 404, así que había que decidir cómo
leer los precios sin depender de una API oficial.

## Investigación (21-11-2026)

- Ambas tiendas entregan la búsqueda (`/busqueda?ft=<consulta>`) renderizada en el
  servidor: el navegador no hace llamadas aparte para traer los productos.
- Un `GET` simple responde 200 en cerca de 1 segundo (1,4 a 1,7 MB) y no se detectó
  protección anti-bot.
- La respuesta incluye un bloque `<script type="application/ld+json">` de schema.org con
  un `ItemList` de 40 productos: nombre, marca, imagen, URL, precio en CLP y
  disponibilidad.
- El JSON-LD no trae SKU. El slug de la URL identifica el producto y coincide entre
  ambas tiendas: en la prueba con las consultas "arroz" y "pollo", 27 de los 80 productos
  de Jumbo también estaban en Santa Isabel.
- `robots.txt`: Jumbo usa comodines (`*?map=`, `*sc=*`) y no bloquea `/busqueda`. Santa
  Isabel permite todo salvo `/api/`, `/_next/`, `/private/`, `/admin/` y `/home-qa`.

## Decisión

Leer el JSON-LD `ItemList` de la búsqueda de cada tienda con `httpx`, sin navegador y sin
parsear HTML ni CSS. Controles aplicados en `python-service/app/scrapers/`:

- User-Agent identificable (`MenuSmartBot/1.0`, con la URL del repositorio).
- Intérprete propio de `robots.txt` con soporte de comodines (`urllib.robotparser` no los
  soporta). Se cachea 1 hora; si no se puede leer, no se scrapea.
- Una solicitud por segundo por tienda, timeout de 10 s y 2 reintentos con espera
  creciente (sin reintentar ante 403 o 429).
- Las redirecciones solo se aceptan dentro del dominio de la tienda, y las respuestas
  están limitadas a 5 MB.
- Validación de cada registro (precio entero mayor que cero en CLP, nombre, URL https de
  la tienda), deduplicación por slug y precio unitario calculado desde el nombre.
- Python no escribe en la base de datos: devuelve los registros a NestJS, que los valida
  y los persiste (sección 5.1 del enunciado).

## Alternativas descartadas

- API VTEX pública: responde 404.
- Parsear HTML o CSS: se rompe con cualquier cambio visual.
- Navegador headless: pesado e innecesario, los datos ya vienen en el HTML.
- Datos abiertos de ODEPA: solo promedios regionales, no sirven para comparar por producto.

## Consecuencias y limitaciones

- Se obtienen los primeros 40 resultados de cada consulta (una página), suficiente para
  comparar precios.
- El precio es el vigente, con oferta incluida; no se distingue el precio normal.
- La cantidad y el precio unitario se derivan del nombre ("1 kg", "400 g"). Si el nombre
  no trae cantidad, no se calcula y no se inventa.
- Si una tienda cambia o elimina el JSON-LD, la consulta falla con el error `estructura` y
  no se guardan datos. Los tests usan fixtures reales (capturados el 21-11-2026) y
  detectan cambios en el parser, no cambios en el sitio real.
- Una búsqueda sin resultados puede no traer `ItemList` y se reporta como `estructura`.
- El cruce por slug cubre solo una parte de los productos, así que el comparador
  trabaja con productos idénticos y con el mejor precio unitario por ingrediente.
- Los términos de servicio de las tiendas no fueron analizados jurídicamente. El uso es
  académico, de bajo volumen, solo sobre páginas públicas de búsqueda, sin login,
  carrito ni datos personales.
