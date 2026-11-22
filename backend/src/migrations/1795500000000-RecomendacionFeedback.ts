import { MigrationInterface, QueryRunner } from 'typeorm';

/** Decisiones del usuario sobre las recetas sugeridas (aceptadas y rechazadas). */
export class RecomendacionFeedback1795500000000 implements MigrationInterface {
  name = 'RecomendacionFeedback1795500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "recomendacion_feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuarioId" uuid NOT NULL, "recetaId" character varying NOT NULL, "accion" character varying NOT NULL, "creadoEn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_recomendacion_feedback_usuario_receta" UNIQUE ("usuarioId", "recetaId"), CONSTRAINT "PK_recomendacion_feedback" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recomendacion_feedback_usuario" ON "recomendacion_feedback" ("usuarioId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "recomendacion_feedback" ADD CONSTRAINT "FK_recomendacion_feedback_usuario" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recomendacion_feedback" DROP CONSTRAINT "FK_recomendacion_feedback_usuario"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_recomendacion_feedback_usuario"`);
    await queryRunner.query(`DROP TABLE "recomendacion_feedback"`);
  }
}
