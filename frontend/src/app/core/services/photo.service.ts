import { Injectable, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ActionSheetController } from '@ionic/angular/lazy';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DESKTOP_BREAKPOINT } from './layout.service';

/**
 * "Elegir foto" (ver Figma, pantalla 10):
 * - Mobile (celular/tablet vertical): action sheet con "Tomar foto" (cámara)
 *   y "Elegir de galería".
 * - Desktop (layout desktop, ≥1024px): un computador no tiene una cámara que
 *   abrir como la de un celular, así que va directo a "Elegir de galería"
 *   (el explorador de archivos del sistema operativo).
 *
 * "Tomar foto" exige las DOS condiciones: layout mobile y puntero táctil.
 * Solo con el puntero no basta: un notebook con pantalla táctil, o DevTools
 * en modo responsive, reportan `pointer: coarse` aunque la ventana sea de
 * escritorio. Y solo con el ancho tampoco: un PC con la ventana angosta
 * usaría el layout mobile pero sigue sin cámara. Una tablet horizontal (que
 * usa el layout desktop) no pierde la cámara: el selector de archivos
 * nativo de iOS/Android ya ofrece "Tomar foto".
 *
 * No se usa Capacitor.isNativePlatform(): da false en cualquier navegador,
 * incluido el de un celular real, y la app corre como web responsiva.
 */
@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** true si se puede ofrecer "Tomar foto": layout mobile y puntero táctil. */
  esMobile(): boolean {
    if (typeof window === 'undefined' || this.breakpointObserver.isMatched(DESKTOP_BREAKPOINT)) {
      return false;
    }
    return window.matchMedia('(pointer: coarse)').matches;
  }

  /** Devuelve el webPath de la foto elegida, o undefined si el usuario canceló. */
  async elegirFoto(): Promise<string | undefined> {
    if (!this.esMobile()) {
      return this.capturar(CameraSource.Photos);
    }

    return new Promise<string | undefined>((resolve) => {
      let resuelto = false;
      const terminar = (valor: string | undefined) => {
        resuelto = true;
        resolve(valor);
      };

      this.actionSheetCtrl
        .create({
          header: 'Foto de la comida',
          cssClass: 'ms-action-sheet',
          buttons: [
            {
              text: 'Tomar foto',
              icon: 'camera-outline',
              handler: () => {
                this.capturar(CameraSource.Camera).then(terminar);
              },
            },
            {
              text: 'Elegir de galería',
              icon: 'image-outline',
              handler: () => {
                this.capturar(CameraSource.Photos).then(terminar);
              },
            },
            { text: 'Cancelar', role: 'cancel', icon: 'close-outline' },
          ],
        })
        .then((sheet) => {
          sheet.onDidDismiss().then(() => {
            if (!resuelto) {
              terminar(undefined);
            }
          });
          sheet.present();
        });
    });
  }

  private async capturar(source: CameraSource): Promise<string | undefined> {
    try {
      const photo = await Camera.getPhoto({
        source,
        resultType: CameraResultType.Uri,
        quality: 80,
        allowEditing: false,
      });
      return photo.webPath;
    } catch {
      // El usuario canceló el permiso, la cámara o el explorador de
      // archivos: no es un error real.
      return undefined;
    }
  }
}
