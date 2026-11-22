import { formatearCantidad, parsearCantidad } from './cantidad';
import { hoyISO, lunesDe, rangoDeSemana, sumarDias } from './semana';

describe('parsearCantidad', () => {
  it.each([
    ['400 g', 400, 'g'],
    ['1,5 kg', 1.5, 'kg'],
    ['0.8 kg', 0.8, 'kg'],
    ['4 unid.', 4, 'unid.'],
    ['2 cdas', 2, 'cdas'],
    ['3', 3, 'un'],
    ['1/2 taza', 0.5, 'taza'],
    ['  12   unidades ', 12, 'unidades'],
  ])('interpreta %p', (texto, cantidad, unidad) => {
    expect(parsearCantidad(texto)).toEqual({ cantidad, unidad });
  });

  it.each(['', 'un poco', 'g 400', '0 kg', '1/0 taza', '-2 kg'])('rechaza %p', (texto) => {
    expect(parsearCantidad(texto)).toBeNull();
  });
});

describe('formatearCantidad', () => {
  it('usa coma decimal y "unid." para unidades sueltas', () => {
    expect(formatearCantidad(0.8, 'kg')).toBe('0,8 kg');
    expect(formatearCantidad(4, 'un')).toBe('4 unid.');
    expect(formatearCantidad(400, 'g')).toBe('400 g');
  });

  it('no usa separador de miles, para que el texto se pueda volver a leer', () => {
    const texto = formatearCantidad(1500, 'g');
    expect(texto).toBe('1500 g');
    expect(parsearCantidad(texto)).toEqual({ cantidad: 1500, unidad: 'g' });
  });
});

describe('semana', () => {
  it('calcula el lunes de cualquier día de la semana', () => {
    expect(lunesDe('2026-11-25')).toBe('2026-11-23');
    expect(lunesDe('2026-11-29')).toBe('2026-11-23');
    expect(lunesDe('2026-01-01')).toBe('2025-12-29');
  });

  it('suma y resta días cruzando meses', () => {
    expect(sumarDias('2026-11-23', 7)).toBe('2026-11-30');
    expect(sumarDias('2026-12-01', -7)).toBe('2026-11-24');
  });

  it('describe el rango de la semana', () => {
    expect(rangoDeSemana('2026-11-23')).toBe('23 - 29 nov');
    expect(rangoDeSemana('2026-11-30')).toBe('30 nov - 6 dic');
  });

  it('formatea hoy con ceros', () => {
    expect(hoyISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
