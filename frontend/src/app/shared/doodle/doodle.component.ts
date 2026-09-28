import { Component, Input } from '@angular/core';

type DoodleKey = 'pasta' | 'salad' | 'chicken' | 'pot' | 'pan' | 'pizza' | 'steak';

// Mismo mapeo que MEAL_DOODLE del plugin de Figma (+ "Pasta casera", que el
// mock de la app tiene y el de Figma no). Lo que no está mapeado usa 'pot'.
const DOODLE_POR_COMIDA: Record<string, DoodleKey> = {
  'Tallarines con salsa': 'pasta',
  'Pasta casera': 'pasta',
  Ensalada: 'salad',
  'Pollo al horno': 'chicken',
  Cazuela: 'pot',
  Tortilla: 'pan',
  'Pizza casera': 'pizza',
  Asado: 'steak',
};

/**
 * Ilustración "en tinta" de una comida (Figma: helper doodle(), viewBox
 * 64×64, trazo 2.6). Los SVG van escritos en el template porque el
 * sanitizador de Angular elimina <svg> si se inyecta por innerHTML.
 */
@Component({
  selector: 'app-doodle',
  templateUrl: './doodle.component.html',
  styleUrls: ['./doodle.component.scss'],
  standalone: false,
})
export class DoodleComponent {
  @Input() comida = '';
  @Input() size = 24;

  get key(): DoodleKey {
    return DOODLE_POR_COMIDA[this.comida] ?? 'pot';
  }
}
