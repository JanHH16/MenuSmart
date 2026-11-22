import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EstadoEjecucion = 'en_curso' | 'ok' | 'parcial' | 'fallido';

export interface ErrorEjecucion {
  consulta: string | null;
  tipo: string;
  detalle: string;
}

/** Una corrida de actualización de precios de una tienda: sirve de trazabilidad y de métricas. */
@Entity('ejecuciones_scraping')
@Index('IDX_ejecuciones_tienda_inicio', ['tienda', 'iniciadaEn'])
export class EjecucionScraping {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_ejecuciones_scraping' })
  id: string;

  @Column()
  tienda: string;

  @Column()
  estado: string;

  @Column({ type: 'timestamptz' })
  iniciadaEn: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finalizadaEn: Date | null;

  @Column({ type: 'int', default: 0 })
  consultasTotal: number;

  @Column({ type: 'int', default: 0 })
  consultasOk: number;

  @Column({ type: 'int', default: 0 })
  consultasFallidas: number;

  @Column({ type: 'int', default: 0 })
  registrosExtraidos: number;

  @Column({ type: 'int', default: 0 })
  registrosValidos: number;

  @Column({ type: 'int', default: 0 })
  registrosDuplicados: number;

  @Column({ type: 'int', default: 0 })
  registrosDescartados: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  descartesPorMotivo: Record<string, number>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  errores: ErrorEjecucion[];

  @Column({ type: 'int', nullable: true })
  duracionMs: number | null;
}
