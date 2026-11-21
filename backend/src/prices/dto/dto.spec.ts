import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CompareQueryDto } from './compare-query.dto';
import { LimitQueryDto } from './limit-query.dto';
import { RefreshPricesDto } from './refresh-prices.dto';

async function errores<T extends object>(clase: new () => T, datos: object) {
  return validate(plainToInstance(clase, datos));
}

describe('RefreshPricesDto', () => {
  it('acepta un cuerpo vacío o con tiendas válidas', async () => {
    expect(await errores(RefreshPricesDto, {})).toHaveLength(0);
    expect(await errores(RefreshPricesDto, { tiendas: ['jumbo', 'santa_isabel'] })).toHaveLength(0);
  });

  it.each([
    ['tienda desconocida', { tiendas: ['lider'] }],
    ['lista vacía', { tiendas: [] }],
    ['tiendas repetidas', { tiendas: ['jumbo', 'jumbo'] }],
    ['no es una lista', { tiendas: 'jumbo' }],
  ])('rechaza %s', async (_motivo, datos) => {
    expect((await errores(RefreshPricesDto, datos)).length).toBeGreaterThan(0);
  });
});

describe('CompareQueryDto', () => {
  it('convierte los términos separados por coma a minúsculas', async () => {
    const dto = plainToInstance(CompareQueryDto, { terminos: 'Arroz, pollo ,PAN', limiteComunes: '5' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.terminos).toEqual(['arroz', 'pollo', 'pan']);
    expect(dto.limiteComunes).toBe(5);
  });

  it('acepta una consulta sin parámetros', async () => {
    expect(await errores(CompareQueryDto, {})).toHaveLength(0);
  });

  it.each([
    ['término fuera del catálogo', { terminos: 'arroz,caviar' }],
    ['términos repetidos', { terminos: 'arroz,arroz' }],
    ['límite cero', { limiteComunes: '0' }],
    ['límite excesivo', { limiteComunes: '101' }],
    ['límite no numérico', { limiteComunes: 'muchos' }],
  ])('rechaza %s', async (_motivo, datos) => {
    expect((await errores(CompareQueryDto, datos)).length).toBeGreaterThan(0);
  });
});

describe('LimitQueryDto', () => {
  it('acepta límites entre 1 y 50', async () => {
    expect(await errores(LimitQueryDto, { limite: '1' })).toHaveLength(0);
    expect(await errores(LimitQueryDto, { limite: '50' })).toHaveLength(0);
    expect(await errores(LimitQueryDto, {})).toHaveLength(0);
  });

  it.each(['0', '51', 'abc', '2.5'])('rechaza el límite %s', async (limite) => {
    expect((await errores(LimitQueryDto, { limite })).length).toBeGreaterThan(0);
  });
});
