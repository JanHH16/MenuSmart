import { Tienda, TIENDAS } from '../python-client/scrape.types';

/** Último precio conocido de un producto en una tienda, junto con los datos del producto. */
export interface FilaPrecio {
  productoId: string;
  supermercado: Tienda;
  precio: number;
  precioUnitario: number | null;
  disponible: boolean;
  urlProducto: string | null;
  fechaObtencion: Date;
  consulta: string;
  slug: string;
  nombre: string | null;
  marca: string | null;
  imagenUrl: string | null;
  cantidad: number | null;
  unidad: string | null;
}

export interface PrecioTienda {
  slug: string;
  nombre: string;
  marca: string | null;
  imagenUrl: string | null;
  precio: number;
  precioUnitario: number | null;
  unidad: string | null;
  cantidad: number | null;
  url: string | null;
  disponible: boolean;
  fechaObtencion: string;
  desactualizado: boolean;
}

/**
 * `empate`: mismo precio. `no_comparable`: falta precio unitario o las unidades difieren
 * (por ejemplo kg contra litros). `null`: no hay datos en alguna de las dos tiendas.
 */
export type Veredicto = Tienda | 'empate' | 'no_comparable' | null;

export interface ComparacionTermino {
  termino: string;
  tiendas: Record<Tienda, PrecioTienda | null>;
  masBarata: Veredicto;
  diferenciaUnitaria: number | null;
}

export interface ProductoComun {
  slug: string;
  nombre: string;
  marca: string | null;
  imagenUrl: string | null;
  unidad: string | null;
  cantidad: number | null;
  tiendas: Record<Tienda, PrecioTienda>;
  masBarata: Tienda | 'empate';
  diferencia: number;
}

export interface ComparacionPrecios {
  terminos: ComparacionTermino[];
  comunes: ProductoComun[];
}

const MS_POR_HORA = 3_600_000;

function aPrecioTienda(fila: FilaPrecio, ahora: Date, horasObsoleto: number): PrecioTienda {
  return {
    slug: fila.slug,
    nombre: fila.nombre ?? fila.slug,
    marca: fila.marca,
    imagenUrl: fila.imagenUrl,
    precio: fila.precio,
    precioUnitario: fila.precioUnitario,
    unidad: fila.unidad,
    cantidad: fila.cantidad,
    url: fila.urlProducto,
    disponible: fila.disponible,
    fechaObtencion: fila.fechaObtencion.toISOString(),
    desactualizado: ahora.getTime() - fila.fechaObtencion.getTime() > horasObsoleto * MS_POR_HORA,
  };
}

/** Producto disponible con menor precio unitario (sin precio unitario, por precio del envase). */
function mejorFila(filas: FilaPrecio[]): FilaPrecio | null {
  const disponibles = filas.filter((fila) => fila.disponible);
  if (disponibles.length === 0) return null;
  return [...disponibles].sort((a, b) => {
    const unitarioA = a.precioUnitario ?? Infinity;
    const unitarioB = b.precioUnitario ?? Infinity;
    if (unitarioA !== unitarioB) return unitarioA - unitarioB;
    return a.precio - b.precio;
  })[0];
}

function veredictoUnitario(
  jumbo: PrecioTienda | null,
  santaIsabel: PrecioTienda | null,
): { masBarata: Veredicto; diferenciaUnitaria: number | null } {
  if (!jumbo || !santaIsabel) return { masBarata: null, diferenciaUnitaria: null };
  if (
    jumbo.precioUnitario === null ||
    santaIsabel.precioUnitario === null ||
    jumbo.unidad !== santaIsabel.unidad
  ) {
    return { masBarata: 'no_comparable', diferenciaUnitaria: null };
  }
  if (jumbo.precioUnitario === santaIsabel.precioUnitario) {
    return { masBarata: 'empate', diferenciaUnitaria: 0 };
  }
  return {
    masBarata: jumbo.precioUnitario < santaIsabel.precioUnitario ? 'jumbo' : 'santa_isabel',
    diferenciaUnitaria: Math.abs(jumbo.precioUnitario - santaIsabel.precioUnitario),
  };
}

/**
 * Compara Jumbo y Santa Isabel. Por cada término del catálogo elige el mejor producto de
 * cada tienda por precio unitario. Además lista los productos idénticos (mismo slug) que
 * existen en ambas tiendas, que son la comparación más exacta posible.
 */
export function construirComparacion(
  filas: FilaPrecio[],
  terminos: string[],
  ahora: Date,
  horasObsoleto: number,
  limiteComunes: number,
): ComparacionPrecios {
  const pedidos = new Set(terminos);
  const relevantes = filas.filter((fila) => pedidos.has(fila.consulta));

  const porTermino = terminos.map((termino): ComparacionTermino => {
    const delTermino = relevantes.filter((fila) => fila.consulta === termino);
    const tiendas = Object.fromEntries(
      TIENDAS.map((tienda) => {
        const mejor = mejorFila(delTermino.filter((fila) => fila.supermercado === tienda));
        return [tienda, mejor ? aPrecioTienda(mejor, ahora, horasObsoleto) : null];
      }),
    ) as Record<Tienda, PrecioTienda | null>;
    return { termino, tiendas, ...veredictoUnitario(tiendas.jumbo, tiendas.santa_isabel) };
  });

  const porSlug = new Map<string, Partial<Record<Tienda, FilaPrecio>>>();
  for (const fila of relevantes) {
    const existente = porSlug.get(fila.slug) ?? {};
    existente[fila.supermercado] = fila;
    porSlug.set(fila.slug, existente);
  }

  const comunes: ProductoComun[] = [];
  for (const [slug, tiendas] of porSlug) {
    const { jumbo, santa_isabel: santaIsabel } = tiendas;
    if (!jumbo || !santaIsabel || !jumbo.disponible || !santaIsabel.disponible) continue;
    comunes.push({
      slug,
      nombre: jumbo.nombre ?? slug,
      marca: jumbo.marca,
      imagenUrl: jumbo.imagenUrl ?? santaIsabel.imagenUrl,
      unidad: jumbo.unidad,
      cantidad: jumbo.cantidad,
      tiendas: {
        jumbo: aPrecioTienda(jumbo, ahora, horasObsoleto),
        santa_isabel: aPrecioTienda(santaIsabel, ahora, horasObsoleto),
      },
      masBarata:
        jumbo.precio === santaIsabel.precio
          ? 'empate'
          : jumbo.precio < santaIsabel.precio
            ? 'jumbo'
            : 'santa_isabel',
      diferencia: Math.abs(jumbo.precio - santaIsabel.precio),
    });
  }
  comunes.sort((a, b) => b.diferencia - a.diferencia || a.slug.localeCompare(b.slug));

  return { terminos: porTermino, comunes: comunes.slice(0, limiteComunes) };
}
