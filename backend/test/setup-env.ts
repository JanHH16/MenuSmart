/**
 * Las suites e2e registran usuarios y llaman a las mismas rutas muchas veces desde una sola
 * IP, asi que se elevan los limites de solicitudes. El guard sigue activo: test/seguridad
 * .e2e-spec.ts baja el limite de login para comprobar que responde 429.
 */
process.env.RATE_LIMIT_GLOBAL_MAX = '100000';
process.env.RATE_LIMIT_LOGIN_MAX = '100000';
process.env.RATE_LIMIT_REGISTER_MAX = '100000';
process.env.RATE_LIMIT_REFRESH_MAX = '100000';
