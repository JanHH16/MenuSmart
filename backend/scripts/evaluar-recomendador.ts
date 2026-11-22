/**
 * Evaluacion reproducible del recomendador contra versiones base (sin adaptacion).
 *
 *   npm run evaluar:recomendador
 *
 * Lee los precios vigentes de la base de datos, simula a un usuario que arma el menu de la
 * semana aceptando sugerencias de una en una (como en la app, que recalcula tras cada una) y
 * compara tres estrategias: adaptativa (costo y reutilizacion), alfabetica y aleatoria (semilla
 * fija, promedio de muchas repeticiones). Escribe docs/evaluacion-recomendador.md.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppDataSource } from '../src/data-source';
import { TERMINOS } from '../src/prices/catalogo';
import { FilaPrecio } from '../src/prices/compare';
import { SQL_PRECIOS_VIGENTES, SQL_ULTIMAS_EXITOSAS } from '../src/prices/prices.sql';
import { RECETAS, Receta } from '../src/recommendations/recetas';
import {
  Candidata,
  costoDeReceta,
  MetricasMenu,
  metricasDeMenu,
  ordenBase,
  pesosDesdeCosto,
  puntuar,
} from '../src/recommendations/scoring';

const TAMANO_MENU = 5; // recetas que acepta el usuario en la semana
const REPETICIONES_ALEATORIAS = 1000;
const HORAS_OBSOLETO = 48;
const SEMILLA = 20261122;

function mulberry32(semilla: number): () => number {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Escenario {
  nombre: string;
  /** Recetas que el usuario ya tenia planificadas antes de pedir sugerencias. */
  plan: string[];
}

const ESCENARIOS: Escenario[] = [
  { nombre: 'Semana vacía', plan: [] },
  { nombre: 'Plan con 2 recetas (arroz con pollo, ensalada chilena)', plan: ['arroz-con-pollo', 'ensalada-chilena'] },
  { nombre: 'Plan con 3 recetas (pollo al horno, charquicán, tortilla de papas)', plan: ['pollo-al-horno', 'charquican', 'tortilla-de-papas'] },
];

const PESOS_COSTO = [100, 60, 30];

const terminosDe = (recetas: Receta[]) =>
  new Set(recetas.flatMap((r) => r.ingredientes.map((i) => i.termino)));

function promediar(metricas: MetricasMenu[]): MetricasMenu {
  const media = (valor: (m: MetricasMenu) => number) =>
    metricas.reduce((suma, m) => suma + valor(m), 0) / metricas.length;
  return {
    costoPromedioPorPorcion: Math.round(media((m) => m.costoPromedioPorPorcion)),
    costoCanasta: Math.round(media((m) => m.costoCanasta)),
    ingredientesDistintos: Math.round(media((m) => m.ingredientesDistintos) * 10) / 10,
    proporcionUsoUnico: Math.round(media((m) => m.proporcionUsoUnico) * 100) / 100,
  };
}

async function main() {
  await AppDataSource.initialize();
  const filas = await AppDataSource.query<FilaPrecio[]>(SQL_PRECIOS_VIGENTES, [[...TERMINOS]]);
  const exitosas = await AppDataSource.query<{ tienda: string; finalizadaEn: Date }[]>(SQL_ULTIMAS_EXITOSAS);
  await AppDataSource.destroy();

  // Solo datos reales: se excluyen los productos de prueba que dejan los tests e2e.
  const reales = filas.filter((f) => !f.slug.startsWith('e2e-') && !f.slug.startsWith('dom-e2e-'));
  const ahora = new Date();
  const candidatasTodas: Candidata[] = RECETAS.filter((r) => r.tipo !== 'desayuno').map((receta) => ({
    receta,
    costo: costoDeReceta(receta, reales, ahora, HORAS_OBSOLETO),
  }));
  const valorizables = candidatasTodas.filter((c) => c.costo.cobertura >= 0.7);

  const porId = new Map(candidatasTodas.map((c) => [c.receta.id, c]));
  const metricas = (menu: Candidata[]) => metricasDeMenu(menu, reales, ahora, HORAS_OBSOLETO);

  /** Arma el menu aceptando de a una la mejor sugerencia, recalculando tras cada una. */
  const armarAdaptativo = (plan: Candidata[], pesoCosto: number): Candidata[] => {
    const menu = [...plan];
    const aceptadas: Candidata[] = [];
    for (let i = 0; i < TAMANO_MENU; i++) {
      const restantes = candidatasTodas.filter((c) => !menu.includes(c));
      const [mejor] = puntuar(restantes, terminosDe(menu.map((c) => c.receta)), pesosDesdeCosto(pesoCosto));
      menu.push(mejor);
      aceptadas.push(mejor);
    }
    return [...plan, ...aceptadas];
  };

  const armarAlfabetico = (plan: Candidata[]): Candidata[] =>
    [...plan, ...ordenBase(candidatasTodas.filter((c) => !plan.includes(c))).slice(0, TAMANO_MENU)];

  const armarAleatorio = (plan: Candidata[]): MetricasMenu => {
    const azar = mulberry32(SEMILLA);
    const resultados: MetricasMenu[] = [];
    for (let k = 0; k < REPETICIONES_ALEATORIAS; k++) {
      const pool = candidatasTodas.filter((c) => !plan.includes(c));
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(azar() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      resultados.push(metricas([...plan, ...pool.slice(0, TAMANO_MENU)]));
    }
    return promediar(resultados);
  };

  const pesos$ = (n: number) => `$${n.toLocaleString('es-CL')}`;
  const fila = (nombre: string, m: MetricasMenu) =>
    `| ${nombre} | ${pesos$(m.costoPromedioPorPorcion)} | ${pesos$(m.costoCanasta)} | ${m.ingredientesDistintos} | ${Math.round(m.proporcionUsoUnico * 100)}% |`;

  const lineas: string[] = [];
  const resultados: {
    escenario: string;
    alfabetico: MetricasMenu;
    aleatorio: MetricasMenu;
    adaptativo: Record<number, MetricasMenu>;
  }[] = [];

  for (const escenario of ESCENARIOS) {
    const plan = escenario.plan.map((id) => porId.get(id) as Candidata);
    const alfabetico = metricas(armarAlfabetico(plan));
    const aleatorio = armarAleatorio(plan);
    lineas.push(`### ${escenario.nombre}`, '');
    const adaptativoPorPeso: Record<number, MetricasMenu> = {};
    lineas.push('| Estrategia | Costo por porción | Costo de la canasta | Ingredientes distintos | Ingredientes de un solo uso |');
    lineas.push('|---|---|---|---|---|');
    lineas.push(fila('Base alfabética', alfabetico));
    lineas.push(fila(`Base aleatoria (promedio de ${REPETICIONES_ALEATORIAS})`, aleatorio));
    for (const peso of PESOS_COSTO) {
      const adaptativo = metricas(armarAdaptativo(plan, peso));
      lineas.push(fila(`Adaptativa (costo ${peso}%, reutilización ${100 - peso}%)`, adaptativo));
      adaptativoPorPeso[peso] = adaptativo;
    }
    resultados.push({ escenario: escenario.nombre, alfabetico, aleatorio, adaptativo: adaptativoPorPeso });
    lineas.push('');
  }

  const pct = (base: number, valor: number) => Math.round(((base - valor) / base) * 100);
  const ahorrosVsAleatoria = resultados.map((r) => pct(r.aleatorio.costoCanasta, r.adaptativo[60].costoCanasta));
  const ahorrosVsAlfabetica = resultados.map((r) => pct(r.alfabetico.costoCanasta, r.adaptativo[60].costoCanasta));
  const rango = (valores: number[]) =>
    Math.min(...valores) === Math.max(...valores)
      ? `${valores[0]}%`
      : `entre ${Math.min(...valores)}% y ${Math.max(...valores)}%`;
  const efectoReuso = resultados
    .map((r) => {
      const soloCosto = r.adaptativo[100];
      const conReuso = r.adaptativo[60];
      const mismos =
        soloCosto.costoCanasta === conReuso.costoCanasta &&
        soloCosto.ingredientesDistintos === conReuso.ingredientesDistintos;
      if (mismos) {
        return `- **${r.escenario}:** darle importancia a la reutilización no cambia el menú, porque las recetas más baratas ya comparten ingredientes.`;
      }
      return `- **${r.escenario}:** con reutilización (60/40) el menú compra ${soloCosto.ingredientesDistintos - conReuso.ingredientesDistintos} ingredientes distintos menos y los de un solo uso pasan de ${Math.round(soloCosto.proporcionUsoUnico * 100)}% a ${Math.round(conReuso.proporcionUsoUnico * 100)}%, a cambio de una canasta ${Math.round(((conReuso.costoCanasta - soloCosto.costoCanasta) / soloCosto.costoCanasta) * 100)}% más cara que optimizando solo el costo.`;
    })
    .join('\n');
  const lectura = [
    `- **Frente a elegir sin adaptación**, la canasta del menú adaptativo (60/40) cuesta ${rango(ahorrosVsAleatoria)} menos que la aleatoria y ${rango(ahorrosVsAlfabetica)} menos que la alfabética. Esta diferencia es esperable: el sistema optimiza justamente el costo, así que ganar en costo no es el resultado más informativo.`,
    '- **Lo informativo es el efecto de la reutilización**, que es lo que distingue al recomendador de simplemente "ordenar por precio". Comparando solo costo (100/0) con costo y reutilización (60/40):',
    efectoReuso,
    '- **Qué se pierde:** los menús adaptativos repiten ingredientes y platos baratos (legumbres, papas, huevos, arroz), así que bajan la variedad. La variedad no se mide aquí; por eso el usuario puede reducir el peso del costo, excluir ingredientes, rechazar recetas o desactivar la adaptación.',
  ];

  const ultima = exitosas.map((e) => `${e.tienda}: ${e.finalizadaEn.toISOString().slice(0, 16).replace('T', ' ')} UTC`).join(', ');
  const documento = `# Evaluación del recomendador

> Generado con \`npm run evaluar:recomendador\` el ${ahora.toISOString().slice(0, 10)}. Los números salen de los precios reales guardados en la base de datos; al volver a ejecutarlo con precios más nuevos cambian.

## Qué se evalúa

El recomendador sugiere recetas ordenadas por costo por porción y por reutilización de los ingredientes que ya están en la semana. Esta evaluación responde una pregunta concreta: **¿un menú armado con sus sugerencias cuesta menos y desperdicia menos que uno armado sin adaptación?**

- **Simulación:** el usuario acepta ${TAMANO_MENU} sugerencias de almuerzo o cena, de a una, y el recomendador recalcula después de cada una (así funciona la app).
- **Versiones base (no adaptativas):** orden alfabético, y elección aleatoria con semilla fija (${SEMILLA}) promediada en ${REPETICIONES_ALEATORIAS} repeticiones.
- **Recetas candidatas:** ${candidatasTodas.length} (almuerzos y cenas del catálogo; ${valorizables.length} con al menos 70% de sus ingredientes con precio).
- **Precios:** ${reales.length} precios vigentes de ${new Set(reales.map((f) => f.slug)).size} productos reales de Jumbo y Santa Isabel. Última actualización: ${ultima || 'sin datos'}.

## Indicadores

| Indicador | Definición | Qué significa que baje |
|---|---|---|
| Costo por porción | Costo promedio por porción de las recetas del menú, con la tienda más barata para cada ingrediente | Comer cuesta menos |
| Costo de la canasta | Costo de comprar todos los ingredientes del menú (cantidades repetidas se suman) | Se gasta menos en el supermercado |
| Ingredientes distintos | Cantidad de productos diferentes que hay que comprar | Lista más corta |
| Ingredientes de un solo uso | Porcentaje de ingredientes que aparecen en una sola receta del menú | **Indicador indirecto de desperdicio:** lo que se compra para una sola receta es lo que más probablemente sobra |

## Resultados

${lineas.join('\n')}

## Lectura de los resultados

${lectura.join('\n')}

## Limitaciones (importante)

- **Es una simulación, no una medición con personas.** Demuestra que la adaptación hace lo que promete sobre los datos; no demuestra que a los usuarios les guste o que sigan las sugerencias. La tasa de aceptación, la utilidad percibida y la comprensión de las explicaciones deben medirse con usuarios reales (ver \`docs/objetivos-e-indicadores.md\`).
- **El desperdicio es un proxy.** No se conocen los tamaños de envase ni lo que el usuario ya tiene en casa; "ingrediente de un solo uso" es solo un indicador indirecto.
- **Las cantidades de las recetas son aproximadas** y el catálogo tiene ${RECETAS.length} recetas y 31 ingredientes, lo que limita la variedad.
- **Los precios cambian a diario** y el costo mezcla productos de distinta marca; la estimación usa el más barato de la misma unidad que nombra al ingrediente (filtro por nombre, ver \`docs/normalizacion-de-ingredientes.md\`).
- **Sesgo:** al optimizar costo, el sistema favorece platos con ingredientes baratos (legumbres, papas) y puede rotar poco el menú. Por eso el usuario puede bajar el peso del costo, excluir ingredientes, rechazar recetas o desactivar la adaptación.
`;

  writeFileSync(join(__dirname, '..', '..', 'docs', 'evaluacion-recomendador.md'), documento, 'utf-8');
  console.log(documento);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
