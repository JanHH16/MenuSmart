/** Costo de bcrypt. 12 rondas (~250 ms) encarecen la fuerza bruta sin volver lento el login. */
export const BCRYPT_RONDAS = 12;

/** Algoritmo de firma de los JWT (clave simetrica), el mismo al firmar y al verificar. */
export const JWT_ALGORITMO = 'HS256';

/** Duracion por defecto del token de acceso si JWT_EXPIRES_IN no esta definida. */
export const JWT_EXPIRACION_POR_DEFECTO = '3600s';
