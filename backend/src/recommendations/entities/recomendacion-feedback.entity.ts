import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Lo que el usuario decidio ante una sugerencia. Es lo unico que el recomendador guarda de
 * sus preferencias: las rechazadas dejan de aparecer hasta que el usuario las restablezca.
 */
@Entity('recomendacion_feedback')
@Unique('UQ_recomendacion_feedback_usuario_receta', ['usuarioId', 'recetaId'])
@Index('IDX_recomendacion_feedback_usuario', ['usuarioId'])
export class RecomendacionFeedback {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_recomendacion_feedback' })
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId', foreignKeyConstraintName: 'FK_recomendacion_feedback_usuario' })
  usuario: User;

  @Column()
  usuarioId: string;

  @Column()
  recetaId: string;

  /** `aceptada` o `rechazada`. */
  @Column()
  accion: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}
