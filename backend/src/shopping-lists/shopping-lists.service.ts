import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Comida } from '../meals/entities/comida.entity';
import { semanaDe } from '../meals/meals.service';
import { TERMINOS } from '../prices/catalogo';
import { PricesService } from '../prices/prices.service';
import { PythonClientService } from '../python-client/python-client.service';
import { calcularCostos, CostoItem, ResumenCosto } from './costo';
import { ListaCompraItem } from './entities/lista-compra-item.entity';
import { ListaCompra } from './entities/lista-compra.entity';

export interface ItemListaRespuesta {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria: string | null;
  terminoCatalogo: string | null;
  comprado: boolean;
  /** Como se llego a esta cantidad: nombres originales y reglas de normalizacion. */
  nombresOriginales: string[];
  reglas: string[];
  costo: CostoItem;
}

export interface ListaCompraRespuesta {
  id: string;
  semana: string;
  generadaEn: string;
  items: ItemListaRespuesta[];
  resumen: ResumenCosto;
  /** Ultima actualizacion exitosa de precios por tienda (null si nunca hubo). */
  preciosActualizadosEn: Record<string, string | null>;
}

const claveItem = (nombre: string, unidad: string) => `${nombre}|${unidad}`;

@Injectable()
export class ShoppingListsService {
  constructor(
    @InjectRepository(ListaCompra) private readonly listas: Repository<ListaCompra>,
    @InjectRepository(ListaCompraItem) private readonly items: Repository<ListaCompraItem>,
    @InjectRepository(Comida) private readonly comidas: Repository<Comida>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly python: PythonClientService,
    private readonly prices: PricesService,
  ) {}

  /**
   * Arma la lista de compras de la semana: junta los ingredientes de todas las comidas, los
   * normaliza en el servicio Python (unidades, sinonimos, union) y reemplaza la lista anterior.
   * Lo que el usuario ya habia marcado como comprado se conserva si el item sigue en la lista.
   */
  async generar(usuarioId: string, semana?: string): Promise<ListaCompraRespuesta> {
    const lunes = semanaDe(semana);
    const comidas = await this.comidas.find({
      where: { usuarioId, semana: lunes },
      relations: { ingredientes: true },
    });
    const lineas = comidas.flatMap((comida) =>
      comida.ingredientes.map((i) => ({ name: i.nombre, quantity: i.cantidad, unit: i.unidad })),
    );
    if (lineas.length === 0) {
      throw new UnprocessableEntityException(
        'No hay ingredientes planificados esa semana: agrega comidas con ingredientes primero.',
      );
    }

    const { items: normalizados } = await this.python.normalizeIngredients(lineas);

    await this.dataSource.transaction(async (manager) => {
      const previa = await manager.findOne(ListaCompra, {
        where: { usuarioId, semana: lunes },
        relations: { items: true },
      });
      const comprados = new Set(
        (previa?.items ?? [])
          .filter((item) => item.comprado)
          .map((item) => claveItem(item.nombreNormalizado, item.unidad)),
      );
      if (previa) await manager.delete(ListaCompra, { id: previa.id });

      const lista = await manager.save(manager.create(ListaCompra, { usuarioId, semana: lunes }));
      await manager.insert(
        ListaCompraItem,
        normalizados.map((n) => ({
          listaCompraId: lista.id,
          nombreNormalizado: n.name,
          cantidadTotal: n.quantity,
          unidad: n.unit,
          terminoCatalogo: n.term ?? null,
          categoria: n.category ?? null,
          comprado: comprados.has(claveItem(n.name, n.unit)),
          reglas: n.rules ?? [],
          nombresOriginales: n.original_names ?? [],
        })),
      );
    });

    return this.obtener(usuarioId, lunes);
  }

  async obtener(usuarioId: string, semana?: string): Promise<ListaCompraRespuesta> {
    const lunes = semanaDe(semana);
    const lista = await this.listas.findOne({
      where: { usuarioId, semana: lunes },
      relations: { items: true },
    });
    if (!lista) {
      throw new NotFoundException('Todavía no generaste la lista de compras de esa semana.');
    }

    const items = [...lista.items].sort(
      (a, b) =>
        (a.categoria ?? 'zzz').localeCompare(b.categoria ?? 'zzz') ||
        a.nombreNormalizado.localeCompare(b.nombreNormalizado),
    );
    const terminos = [
      ...new Set(items.map((i) => i.terminoCatalogo).filter((t): t is string => !!t)),
    ].filter((t) => TERMINOS.includes(t));
    const comparacion = terminos.length > 0 ? await this.prices.comparar(terminos) : null;

    const { porItem, resumen } = calcularCostos(
      items.map((i) => ({
        id: i.id,
        cantidad: i.cantidadTotal,
        unidad: i.unidad,
        terminoCatalogo: i.terminoCatalogo,
      })),
      comparacion?.terminos ?? [],
    );

    return {
      id: lista.id,
      semana: lista.semana,
      generadaEn: lista.createdAt.toISOString(),
      items: items.map((i) => ({
        id: i.id,
        nombre: i.nombreNormalizado,
        cantidad: i.cantidadTotal,
        unidad: i.unidad,
        categoria: i.categoria,
        terminoCatalogo: i.terminoCatalogo,
        comprado: i.comprado,
        nombresOriginales: i.nombresOriginales,
        reglas: i.reglas,
        costo: porItem.get(i.id) as CostoItem,
      })),
      resumen,
      preciosActualizadosEn: comparacion?.ultimaActualizacion ?? {},
    };
  }

  /** Marca o desmarca un item como comprado, solo si la lista es del usuario. */
  async marcarComprado(usuarioId: string, itemId: string, comprado: boolean): Promise<void> {
    const item = await this.items.findOne({
      where: { id: itemId },
      relations: { listaCompra: true },
    });
    if (!item || item.listaCompra.usuarioId !== usuarioId) {
      throw new NotFoundException('El item no existe.');
    }
    await this.items.update({ id: itemId }, { comprado });
  }
}
