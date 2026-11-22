import { esFechaISOValida, hoyISO, indiceDia, lunesDe } from './semana';

describe('lunesDe', () => {
  it.each([
    ['2026-11-23', '2026-11-23'], // lunes
    ['2026-11-25', '2026-11-23'], // miercoles
    ['2026-11-29', '2026-11-23'], // domingo
    ['2026-11-30', '2026-11-30'], // lunes siguiente
    ['2026-01-01', '2025-12-29'], // cruza el cambio de anio
    ['2024-03-01', '2024-02-26'], // anio bisiesto
  ])('el lunes de %s es %s', (fecha, lunes) => {
    expect(lunesDe(fecha)).toBe(lunes);
  });

  it.each(['2026-13-01', '2026-02-30', 'ayer', '', '2026-1-1'])('rechaza %p', (fecha) => {
    expect(() => lunesDe(fecha)).toThrow(RangeError);
  });
});

describe('esFechaISOValida', () => {
  it('acepta fechas reales y rechaza las que no existen', () => {
    expect(esFechaISOValida('2024-02-29')).toBe(true);
    expect(esFechaISOValida('2026-02-29')).toBe(false);
  });
});

describe('hoyISO', () => {
  it('formatea con ceros a la izquierda', () => {
    expect(hoyISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('indiceDia', () => {
  it('ordena de lunes a domingo y manda lo desconocido al final', () => {
    expect(indiceDia('lunes')).toBe(0);
    expect(indiceDia('domingo')).toBe(6);
    expect(indiceDia('feriado')).toBe(7);
  });
});
