import { Injectable } from '@angular/core';

export interface Ingrediente {
  id: string;
  nombre: string;
  cantidad: string;
}

export interface Comida {
  id: string;
  nombre: string;
  tipo: string;
  dia: string;
  ingredientes: Ingrediente[];
  /** webPath (Capacitor Camera) o data URL de la foto elegida por el usuario. */
  foto?: string;
}

export interface DiaPlan {
  diaCorto: string;
  numero: number;
  esHoy: boolean;
  comidas: Comida[];
}

export interface NuevaComida {
  nombre: string;
  dia: string;
  tipo: string;
  foto?: string;
}

export interface ComidaGuardada {
  nombre: string;
  tipoOriginal: string;
  ingredientes: Ingrediente[];
  foto?: string;
}

export const TIPOS_COMIDA = ['Desayuno', 'Almuerzo', 'Cena'];

/**
 * Datos de ejemplo para poder maquetar Plan semanal y Detalle de comida
 * siguiendo el diseño de Figma.
 *
 * TODO: reemplazar por llamadas reales a la API de NestJS (endpoint de
 * planificación semanal) cuando ese módulo exista en el backend. La forma
 * de los datos (DiaPlan / Comida / Ingrediente) se pensó para que ese
 * reemplazo no obligue a tocar las páginas, solo esta clase.
 *
 * IMPORTANTE: `id` es un identificador opaco (no derivado del nombre) a
 * propósito. Dos comidas pueden llamarse igual (ej. "Pasta casera" el lunes
 * y otra "Pasta casera" el jueves); si el id fuera el nombre "slugificado"
 * ambas colisionarían en la misma URL /tabs/plan-semanal/comida/:id y
 * `getComida()` solo devolvería la primera. Cuando esto se conecte a la API
 * real, el backend deberá seguir generando un id único por comida (UUID o
 * autoincremental), nunca derivado del nombre.
 */
@Injectable({ providedIn: 'root' })
export class PlanSemanalService {
  private readonly comidas: Comida[] = [
    {
      id: 'm1',
      nombre: 'Tallarines con salsa',
      tipo: 'Almuerzo',
      dia: 'Lunes',
      ingredientes: [
        { id: '1', nombre: 'Tallarines', cantidad: '400 g' },
        { id: '2', nombre: 'Tomate', cantidad: '4 unid.' },
        { id: '3', nombre: 'Cebolla', cantidad: '1 unid.' },
        { id: '4', nombre: 'Ajo', cantidad: '3 dientes' },
        { id: '5', nombre: 'Aceite', cantidad: '2 cdas' },
      ],
    },
    {
      id: 'm2',
      nombre: 'Ensalada',
      tipo: 'Cena',
      dia: 'Lunes',
      ingredientes: [
        { id: '1', nombre: 'Lechuga', cantidad: '1 unid.' },
        { id: '2', nombre: 'Tomate', cantidad: '2 unid.' },
      ],
    },
    {
      id: 'm3',
      nombre: 'Pollo al horno',
      tipo: 'Almuerzo',
      dia: 'Martes',
      ingredientes: [
        { id: '1', nombre: 'Pollo entero', cantidad: '1 kg' },
        { id: '2', nombre: 'Papas', cantidad: '1 kg' },
      ],
    },
    {
      id: 'm4',
      nombre: 'Cazuela',
      tipo: 'Almuerzo',
      dia: 'Jueves',
      ingredientes: [
        { id: '1', nombre: 'Carne para asado', cantidad: '0.8 kg' },
        { id: '2', nombre: 'Zapallo', cantidad: '1 unid.' },
      ],
    },
    {
      id: 'm5',
      nombre: 'Tortilla',
      tipo: 'Cena',
      dia: 'Jueves',
      ingredientes: [{ id: '1', nombre: 'Huevos', cantidad: '6 unid.' }],
    },
    {
      id: 'm6',
      nombre: 'Pasta casera',
      tipo: 'Almuerzo',
      dia: 'Viernes',
      ingredientes: [{ id: '1', nombre: 'Tallarines', cantidad: '300 g' }],
    },
  ];

  private readonly dias: { diaCorto: string; numero: number; nombre: string }[] = [
    { diaCorto: 'LUN', numero: 22, nombre: 'Lunes' },
    { diaCorto: 'MAR', numero: 23, nombre: 'Martes' },
    { diaCorto: 'MIE', numero: 24, nombre: 'Miércoles' },
    { diaCorto: 'JUE', numero: 25, nombre: 'Jueves' },
    { diaCorto: 'VIE', numero: 26, nombre: 'Viernes' },
    { diaCorto: 'SAB', numero: 27, nombre: 'Sábado' },
    { diaCorto: 'DOM', numero: 28, nombre: 'Domingo' },
  ];

  getSemana(): DiaPlan[] {
    const hoy = 'Martes';
    return this.dias.map((dia) => ({
      diaCorto: dia.diaCorto,
      numero: dia.numero,
      esHoy: dia.nombre === hoy,
      comidas: this.comidas.filter((comida) => comida.dia === dia.nombre),
    }));
  }

  getComida(id: string): Comida | undefined {
    return this.comidas.find((comida) => comida.id === id);
  }

  /** Días de la semana (nombre corto para chips + nombre completo para guardar). */
  getDiasSemana(): { corto: string; nombre: string }[] {
    return this.dias.map((dia) => ({ corto: dia.diaCorto, nombre: dia.nombre }));
  }

  crearComida(datos: NuevaComida): Comida {
    const comida: Comida = {
      id: 'm' + (this.comidas.length + 1) + '-' + Date.now().toString(36),
      nombre: datos.nombre,
      dia: datos.dia,
      tipo: datos.tipo,
      foto: datos.foto,
      ingredientes: [],
    };
    this.comidas.push(comida);
    return comida;
  }

  agregarIngrediente(comidaId: string, ingrediente: { nombre: string; cantidad: string }): void {
    const comida = this.getComida(comidaId);
    if (!comida) {
      return;
    }
    comida.ingredientes.push({
      id: Date.now().toString(36),
      nombre: ingrediente.nombre,
      cantidad: ingrediente.cantidad,
    });
  }

  eliminarIngrediente(comidaId: string, ingredienteId: string): void {
    const comida = this.getComida(comidaId);
    if (!comida) {
      return;
    }
    const index = comida.ingredientes.findIndex((i) => i.id === ingredienteId);
    if (index !== -1) {
      comida.ingredientes.splice(index, 1);
    }
  }

  /**
   * Comidas ya guardadas, para reutilizarlas en otro día sin volver a cargar
   * sus ingredientes (ej. "Pollo al horno" del martes también el sábado).
   * Se deduplica por nombre: cada nombre aparece una sola vez, usando los
   * ingredientes de la primera comida encontrada con ese nombre.
   */
  getComidasGuardadas(): ComidaGuardada[] {
    const vistas = new Set<string>();
    const guardadas: ComidaGuardada[] = [];
    for (const comida of this.comidas) {
      if (vistas.has(comida.nombre)) {
        continue;
      }
      vistas.add(comida.nombre);
      guardadas.push({
        nombre: comida.nombre,
        tipoOriginal: comida.tipo,
        ingredientes: comida.ingredientes,
        foto: comida.foto,
      });
    }
    return guardadas;
  }

  /** Clona una comida guardada en un día/tipo distinto (reutilizar receta). */
  reutilizarComida(guardada: ComidaGuardada, dia: string, tipo: string): Comida {
    const comida = this.crearComida({ nombre: guardada.nombre, dia, tipo, foto: guardada.foto });
    for (const ingrediente of guardada.ingredientes) {
      this.agregarIngrediente(comida.id, { nombre: ingrediente.nombre, cantidad: ingrediente.cantidad });
    }
    return comida;
  }
}
