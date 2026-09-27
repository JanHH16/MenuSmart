import { Injectable, inject } from '@angular/core';
import { ActionSheetController } from '@ionic/angular/lazy';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * "Elegir foto" (ver Figma, pantalla 10):
 * - Mobile (celular real, o navegador de escritorio en modo responsive con
 *   puntero táctil): action sheet con "Tomar foto" (cámara) y "Elegir de
 *   galería".
 * - Desktop (mouse, sin pantalla táctil): un computador no tiene cámara que
 *   abrir como la de un celular, así que va directo a "Elegir de galería"
 *   (el explorador de archivos del sistema operativo).
 *
 * OJO: esto es una detección de "¿es un dispositivo táctil/mobile?", no de
 * "¿estoy en la app empaquetada?" (eso sería Capacitor.isNativePlatform(),
 * que da false en cualquier navegador, incluido el de un celular real). La
 * app es una PWA responsiva: el mismo build corre en el navegador del
 * celular y en el de escritorio, así que la decisión debe depender del
 * dispositivo, no de si hay un puente nativo de Capacitor.
 */
@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly actionSheetCtrl = inject(ActionSheetController);

  /** true si el puntero principal es táctil (celular, tablet, o DevTools en modo responsive). */
  esMobile(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
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
