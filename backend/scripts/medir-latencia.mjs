// Mide tiempos de respuesta del backend (uso: npm run medir:latencia -- http://localhost:3000 200) y los compara con /api/metrics.
// Sube el limite global de solicitudes del backend para no medir el 429: RATE_LIMIT_GLOBAL_MAX=100000.
const BASE = process.argv[2] ?? 'http://localhost:3020';
const N = Number(process.argv[3] ?? 200);
const CONCURRENCIA = 10;

async function json(ruta, opciones = {}) {
  const r = await fetch(BASE + ruta, opciones);
  return { status: r.status, cuerpo: r.status === 204 ? null : await r.json().catch(() => null) };
}

const email = `latencia-${Date.now()}@test.cl`;
const registro = await json('/api/auth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: 'Secreto123', name: 'Latencia' }),
});
const token = registro.cuerpo.accessToken;
const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

for (const [nombre, diaSemana] of [['Arroz con pollo', 'lunes'], ['Ensalada', 'martes']]) {
  await json('/api/meals', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      nombre,
      tipo: 'almuerzo',
      diaSemana,
      ingredientes: [
        { nombre: 'Arroz', cantidad: 500, unidad: 'g' },
        { nombre: 'Tomates', cantidad: 4, unidad: 'unidades' },
      ],
    }),
  });
}
await json('/api/shopping-lists/generate', { method: 'POST', headers: auth, body: '{}' });

const percentil = (valores, p) => {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.max(0, Math.round((p / 100) * orden.length) - 1))];
};

const pruebas = [
  ['GET /health', '/health', false],
  ['GET /api/prices/compare', '/api/prices/compare?limiteComunes=12', true],
  ['GET /api/meals', '/api/meals', true],
  ['GET /api/shopping-lists', '/api/shopping-lists', true],
  ['GET /api/recommendations', '/api/recommendations?limite=10', true],
];

console.log(`Solicitudes por ruta: ${N}, concurrencia ${CONCURRENCIA}`);
console.log('| Ruta | p50 (ms) | p95 (ms) | máx (ms) | errores |');
console.log('|---|---|---|---|---|');
for (const [nombre, ruta, conToken] of pruebas) {
  const tiempos = [];
  let errores = 0;
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCIA }, async () => {
      while (siguiente < N) {
        siguiente += 1;
        const inicio = performance.now();
        const r = await fetch(BASE + ruta, { headers: conToken ? auth : {} });
        await r.arrayBuffer();
        tiempos.push(performance.now() - inicio);
        if (r.status >= 400) errores += 1;
      }
    }),
  );
  const f = (v) => v.toFixed(1);
  console.log(`| ${nombre} | ${f(percentil(tiempos, 50))} | ${f(percentil(tiempos, 95))} | ${f(Math.max(...tiempos))} | ${errores} |`);
}

const metricas = await json('/api/metrics', { headers: auth });
console.log('\nSegún /api/metrics (lado servidor):');
console.log('| Ruta | solicitudes | promedio (ms) | p50 (ms) | p95 (ms) | 5xx |');
console.log('|---|---|---|---|---|---|');
for (const r of metricas.cuerpo.rutas.filter((x) => x.solicitudes >= N)) {
  console.log(`| ${r.ruta} | ${r.solicitudes} | ${r.promedioMs} | ${r.p50Ms} | ${r.p95Ms} | ${r.errores5xx} |`);
}
await json('/api/users/me', { method: 'DELETE', headers: auth, body: JSON.stringify({ password: 'Secreto123' }) });
