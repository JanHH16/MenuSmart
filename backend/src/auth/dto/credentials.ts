import { Transform } from 'class-transformer';

/** Quita espacios y pasa a minusculas: "  Ana@Mail.cl " y "ana@mail.cl" son la misma cuenta. */
export const NormalizarEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

export const QuitarEspacios = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
