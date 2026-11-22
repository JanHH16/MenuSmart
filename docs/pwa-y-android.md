# PWA y Android

MenuSmart se entrega como aplicación web, PWA instalable y app Android (Capacitor). Los tres salen del mismo código de `frontend/`.

## Qué se agregó

### PWA
- `@angular/service-worker` 22.1.7 (la misma versión que `@angular/core`).
- `frontend/ngsw-config.json`:
  - **App shell** (`index.html`, JS, CSS, manifiesto) en `prefetch`: se descarga completo al instalar el service worker, así la app abre sin conexión.
  - **Assets** (iconos, SVG de Ionicons) y **fuentes de Google** en carga perezosa.
  - **Datos**: solo `GET /api/prices/compare` se guarda, con estrategia `freshness`: primero se intenta la red (5 s de espera) y, si falla, se muestra la última respuesta guardada (máximo 7 días, 5 entradas).
  - `/api/auth/**` y cualquier otra ruta de `/api/**` nunca se cachean y pasan siempre a la red. Tampoco se sirve `index.html` ante una navegación directa a `/api/**`.
- `frontend/src/manifest.webmanifest`: nombre MenuSmart, `display: standalone`, `lang: es-CL`, fondo `#f3ecda`, tinta `#1f3a93`, iconos 192/512 y maskable en `src/assets/icons/`.
- `index.html`: manifiesto, `theme-color`, icono para iOS, `lang="es"`, título y un viewport que no bloquea el zoom.
- `app.module.ts`: el service worker se registra solo en producción (`registerWhenStable:30000`) y no dentro de la app nativa, donde los archivos ya van empaquetados en el APK.
- En `angular.json` el service worker solo se genera en la configuración `production`. En desarrollo y en las pruebas no hay service worker.

### Conectividad
- `core/services/conectividad.service.ts`: signals `enLinea` y `sinConexion`, a partir de `navigator.onLine` y los eventos `online` / `offline`. No usa zone.js.
- `AppComponent` muestra el aviso "Sin conexión: mostrando los últimos datos guardados" en una región `role="status"` con `aria-live="polite"`. Con conexión el aviso no ocupa espacio y el layout no cambia. Sin conexión empuja el contenido hacia abajo en vez de taparlo, tanto en mobile (tabs abajo) como en desktop (sidebar).
- Cualquier componente puede usar `ConectividadService` para decidir qué mostrar. No se modificó el comparador ni las demás páginas.

### Android
- `@capacitor/android` 8.5.2 (igual que `@capacitor/core`) y el proyecto nativo en `frontend/android/`, versionado en git.
- `capacitor.config.ts`: `appId: cl.menusmart.app`, `appName: MenuSmart`, `webDir: www`, `androidScheme: https`.
- `AndroidManifest.xml`: solo el permiso `INTERNET`. `allowBackup` desactivado para que el token de sesión no vaya a copias de seguridad. Para elegir fotos Capacitor usa el selector del sistema, que no exige permisos propios.
- Iconos y splash de la marca (libreta con tinta azul) en lugar de los de Capacitor.
- No se versionan los assets web copiados (`app/src/main/assets/public`), la configuración generada por `cap sync`, `build/` ni `local.properties` (los ignora `frontend/android/.gitignore`).

### Accesibilidad del shell
- Foco visible global (`:focus-visible`), con variante amarilla sobre los fondos azules.
- `prefers-reduced-motion`: sin animaciones propias y con `animated: false` en Ionic.
- Navegación principal etiquetada (`aria-label`) en el tab bar y en el sidebar. El resto de landmarks (`main`, `banner`, `status`) ya salen de Ionic y del aviso de conexión.
- La accesibilidad de cada página (formularios, contraste, textos alternativos) no se revisó aquí.

## Probar la PWA

El service worker solo existe en el build de producción y exige HTTPS o `localhost`.

```bash
cd frontend
npx ng build            # genera www/ con ngsw.json y manifest.webmanifest
```

Hay que servir `www/` con fallback a `index.html` y con `/api` apuntando al backend (la app llama a `/api/...` en el mismo origen). La forma más fiel es el stack de Docker Compose, cuyo nginx ya hace ambas cosas. Con un servidor estático simple la app carga, pero las llamadas a la API fallan.

Comprobaciones en Chrome o Edge (DevTools, pestaña Application):
1. **Manifest**: sin errores, 4 iconos, se ofrece "Instalar".
2. **Service Workers**: `ngsw-worker.js` activo. Se registra cuando la app queda estable o a los 30 s como máximo, no de inmediato.
3. **Cache Storage**: aparecen las cachés `ngsw:/:...:app-shell` y, tras abrir el comparador, `ngsw:/:1:data:precios-comparador`.
4. **Sin conexión**: marcar Offline en Network y recargar. La app abre, aparece el aviso y el comparador muestra los últimos precios.

Cuando se publica una versión nueva, el service worker la detecta, la descarga y la aplica en la siguiente carga de la página.

## App Android

```bash
cd frontend
npx ng build
npx cap sync android    # copia www/ y actualiza plugins en android/
npx cap open android    # abre el proyecto en Android Studio
```

En Android Studio: esperar a que termine el Gradle sync y ejecutar en un emulador o dispositivo. Requiere Android Studio reciente con JDK 21 y el SDK de Android 36.

Cada vez que cambie el código web hay que repetir `ng build` y `cap sync android`.

## Workflow de GitHub Actions

`.github/workflows/android.yml` (independiente de `ci.yml`), en cada `push` y `pull_request`:

1. Instala Node 24 y Java 21 (Temurin).
2. `npm ci`, `ng build` y `cap sync android`.
3. `./gradlew assembleDebug` en `frontend/android`.
4. Sube `app-debug.apk` como artefacto `menusmart-debug-apk` (14 días).

Las acciones están fijadas por SHA de commit, con la versión en un comentario. Se validó con `actionlint`.

## Limitaciones

- **El APK no se compiló ni se probó.** El equipo donde se preparó esto no tiene Android SDK ni Java. Lo único verificado es que `cap add` y `cap sync` generan el proyecto sin errores. La primera compilación real será la del workflow o la de Android Studio.
- **No se probó en un dispositivo ni emulador Android.** El comportamiento sin conexión se verificó en Edge de escritorio, con el servidor apagado.
- `navigator.onLine` solo detecta si hay una red conectada, no si hay salida a internet. Un wifi sin acceso se verá como "en línea" y las llamadas fallarán como siempre.
- La caché de `/api/prices/compare` es del navegador, no del usuario. Es seguro porque esa respuesta es igual para todos, pero conviene tenerlo presente si algún día esa ruta devuelve datos por usuario: habría que sacarla de `ngsw-config.json`.
- Solo el comparador tiene datos sin conexión. Plan semanal, lista de compras y perfil siguen necesitando red para guardar y leer del backend.

## Pasos manuales pendientes

1. **URL de la API en Android.** Definir la variable de GitHub `STAGING_BACKEND_URL` (la misma del despliegue a staging): el workflow `android.yml` la usa para compilar con la configuración `android` (ver la sección "URL del backend en la app Android" más abajo). Sin ella el APK se compila pero no puede conectarse a ningún backend.
2. **Probar en un dispositivo real** (o emulador) y comprobar el modo sin conexión, la cámara y la galería.
3. **Firma de release.** El workflow solo genera un APK de depuración. Para publicar en Play Store hace falta un keystore propio, guardado como secreto de GitHub y fuera del repositorio, y un `assembleRelease` o `bundleRelease`.
4. **Auditoría Lighthouse** (PWA y accesibilidad) sobre el build servido por nginx, para dejar evidencia en la entrega.

## URL del backend en la app Android

Dentro de la app nativa el origen es `https://localhost`, así que el proxy relativo `/api` de nginx no existe. Por eso hay una configuración de build propia:

- `frontend/src/environments/environment.android.ts` lleva un marcador (`URL_DEL_BACKEND_NO_CONFIGURADA`) en lugar de la URL.
- `ng build --configuration android` usa ese archivo.
- El workflow `android.yml` reemplaza el marcador por la variable de GitHub `STAGING_BACKEND_URL` (la misma que usa el despliegue a staging). Si la variable no existe, el APK se compila igual pero muestra una advertencia, y no podrá conectarse a ningún backend.

Para compilar a mano, cambia el marcador por la URL del backend desplegado (sin barra final y terminada en `/api`) y ejecuta:

```powershell
cd frontend
npx ng build --configuration android
npx cap sync android
```

El backend acepta cualquier origen (CORS abierto, ver `docs/seguridad-privacidad-etica.md`), por lo que no necesita cambios para esta app.
