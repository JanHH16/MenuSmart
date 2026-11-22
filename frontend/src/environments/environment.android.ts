// Dentro de la app Android el origen es https://localhost (el WebView de Capacitor), así que
// el proxy relativo "/api" de nginx no existe: hace falta la URL absoluta y HTTPS del backend.
// El workflow android.yml reemplaza este marcador por la variable STAGING_BACKEND_URL de GitHub;
// para compilar a mano, cámbialo por la URL del backend desplegado (sin barra final y con /api).
export const environment = {
  production: true,
  apiUrl: 'https://URL_DEL_BACKEND_NO_CONFIGURADA/api',
};
