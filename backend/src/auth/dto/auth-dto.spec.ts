import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

async function errores<T extends object>(clase: new () => T, datos: object) {
  const instancia = plainToInstance(clase, datos);
  const fallos = await validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
  return { instancia, campos: fallos.map((f) => f.property) };
}

const valido = { email: 'ana@correo.cl', password: 'clave1234', name: 'Ana' };

describe('RegisterDto', () => {
  it('acepta datos válidos', async () => {
    expect((await errores(RegisterDto, valido)).campos).toEqual([]);
  });

  it.each([
    ['muy corta', 'abc123'],
    ['sin números', 'sololetras'],
    ['sin letras', '1234567890'],
    ['más larga que el límite de bcrypt', `a1${'x'.repeat(71)}`],
  ])('rechaza una contraseña %s', async (_motivo, password) => {
    expect((await errores(RegisterDto, { ...valido, password })).campos).toEqual(['password']);
  });

  it('normaliza el email (espacios y mayúsculas) y recorta el nombre', async () => {
    const { instancia, campos } = await errores(RegisterDto, {
      ...valido,
      email: '  Ana@Correo.CL ',
      name: '  Ana  ',
    });
    expect(campos).toEqual([]);
    expect(instancia.email).toBe('ana@correo.cl');
    expect(instancia.name).toBe('Ana');
  });

  it('no deja pasar campos desconocidos', async () => {
    expect((await errores(RegisterDto, { ...valido, rol: 'admin' })).campos).toEqual(['rol']);
  });
});

describe('LoginDto', () => {
  it('normaliza el email igual que el registro', async () => {
    const { instancia, campos } = await errores(LoginDto, {
      email: ' ANA@correo.cl',
      password: 'x',
    });
    expect(campos).toEqual([]);
    expect(instancia.email).toBe('ana@correo.cl');
  });

  it('no exige la política nueva a cuentas antiguas con contraseñas cortas', async () => {
    const { campos } = await errores(LoginDto, { email: 'ana@correo.cl', password: '123456' });
    expect(campos).toEqual([]);
  });

  it('rechaza contraseñas vacías o gigantes', async () => {
    const vacia = await errores(LoginDto, { email: 'ana@correo.cl', password: '' });
    expect(vacia.campos).toEqual(['password']);
    const gigante = await errores(LoginDto, { email: 'ana@correo.cl', password: 'x'.repeat(5000) });
    expect(gigante.campos).toEqual(['password']);
  });
});
