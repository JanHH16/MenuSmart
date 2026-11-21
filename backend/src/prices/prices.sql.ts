/**
 * Consultas con unnest: insertan un lote completo en un solo viaje a la base y son
 * idempotentes (ON CONFLICT). Todo va parametrizado.
 */
export const SQL_UPSERT_PRODUCTOS = `
  INSERT INTO "productos"
    ("slug", "nombreNormalizado", "nombre", "marca", "categoria", "imagenUrl", "cantidad", "unidad")
  SELECT * FROM unnest(
    $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::float8[], $8::text[]
  )
  ON CONFLICT ("slug") DO UPDATE SET
    "nombreNormalizado" = EXCLUDED."nombreNormalizado",
    "nombre" = EXCLUDED."nombre",
    "marca" = EXCLUDED."marca",
    "imagenUrl" = EXCLUDED."imagenUrl",
    "cantidad" = EXCLUDED."cantidad",
    "unidad" = EXCLUDED."unidad"
  RETURNING "id", "slug"`;

export const SQL_UPSERT_PRECIOS = `
  INSERT INTO "precios_supermercado"
    ("productoId", "supermercado", "precio", "fechaObtencion", "fechaDia", "consulta",
     "precioUnitario", "disponible", "urlProducto", "ejecucionId")
  SELECT x."productoId", $2::text, x."precio", $3::timestamptz, $4::date, x."consulta",
         x."precioUnitario", x."disponible", x."urlProducto", $5::uuid
  FROM unnest($1::uuid[], $6::float8[], $7::text[], $8::int[], $9::bool[], $10::text[])
    AS x("productoId", "precio", "consulta", "precioUnitario", "disponible", "urlProducto")
  ON CONFLICT ("supermercado", "productoId", "fechaDia") DO UPDATE SET
    "precio" = EXCLUDED."precio",
    "fechaObtencion" = EXCLUDED."fechaObtencion",
    "consulta" = EXCLUDED."consulta",
    "precioUnitario" = EXCLUDED."precioUnitario",
    "disponible" = EXCLUDED."disponible",
    "urlProducto" = EXCLUDED."urlProducto",
    "ejecucionId" = EXCLUDED."ejecucionId"`;

/** Último precio de cada producto en cada tienda, para los términos pedidos. */
export const SQL_PRECIOS_VIGENTES = `
  SELECT DISTINCT ON (p."supermercado", p."productoId")
    p."productoId", p."supermercado", p."precio", p."precioUnitario", p."disponible",
    p."urlProducto", p."fechaObtencion", p."consulta",
    pr."slug", pr."nombre", pr."marca", pr."imagenUrl", pr."cantidad", pr."unidad"
  FROM "precios_supermercado" p
  JOIN "productos" pr ON pr."id" = p."productoId"
  WHERE p."consulta" = ANY($1::text[]) AND pr."slug" IS NOT NULL
  ORDER BY p."supermercado", p."productoId", p."fechaObtencion" DESC`;

export const SQL_ULTIMAS_EXITOSAS = `
  SELECT DISTINCT ON ("tienda") "tienda", "finalizadaEn"
  FROM "ejecuciones_scraping"
  WHERE "estado" IN ('ok', 'parcial') AND "finalizadaEn" IS NOT NULL
  ORDER BY "tienda", "finalizadaEn" DESC`;

export const SQL_COBERTURA = `
  SELECT p."supermercado", p."consulta"
  FROM "precios_supermercado" p
  WHERE p."fechaObtencion" > $1::timestamptz
  GROUP BY p."supermercado", p."consulta"`;
