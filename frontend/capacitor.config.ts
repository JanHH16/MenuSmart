import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.menusmart.app',
  appName: 'MenuSmart',
  // Carpeta que genera `ng build` (ver outputPath en angular.json).
  webDir: 'www',
  server: {
    // La WebView sirve la app desde https://localhost. Con https, las cookies,
    // el almacenamiento y las APIs que exigen contexto seguro funcionan igual
    // que en la web publicada. El trafico a la API debe ser siempre HTTPS.
    androidScheme: 'https',
  },
};

export default config;
