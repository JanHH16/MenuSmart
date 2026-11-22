import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Plan semanal y lista de compras reales: las comidas pasan a pertenecer a una semana y a
 * tener tipo, porciones y notas; la lista guarda a que termino del catalogo se mapeo cada
 * ingrediente y las reglas de normalizacion aplicadas.
 */
export class PlanSemanalYListas1795400000000 implements MigrationInterface {
  name = 'PlanSemanalYListas1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // comidas: "semana" es obligatoria, asi que primero se agrega nula y se rellena.
    await queryRunner.query(`ALTER TABLE "comidas" ADD "semana" date`);
    await queryRunner.query(
      `UPDATE "comidas" SET "semana" = date_trunc('week', "createdAt")::date WHERE "semana" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "comidas" ALTER COLUMN "semana" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "comidas" ADD "tipo" character varying NOT NULL DEFAULT 'almuerzo'`,
    );
    await queryRunner.query(`ALTER TABLE "comidas" ADD "porciones" integer NOT NULL DEFAULT '1'`);
    await queryRunner.query(`ALTER TABLE "comidas" ADD "notas" text`);
    await queryRunner.query(
      `CREATE INDEX "IDX_comidas_usuario_semana" ON "comidas" ("usuarioId", "semana")`,
    );

    await queryRunner.query(
      `ALTER TABLE "listas_compra" ADD CONSTRAINT "UQ_listas_compra_usuario_semana" UNIQUE ("usuarioId", "semana")`,
    );

    await queryRunner.query(`ALTER TABLE "lista_compra_items" ADD "terminoCatalogo" character varying`);
    await queryRunner.query(`ALTER TABLE "lista_compra_items" ADD "categoria" character varying`);
    await queryRunner.query(
      `ALTER TABLE "lista_compra_items" ADD "comprado" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "lista_compra_items" ADD "reglas" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lista_compra_items" ADD "nombresOriginales" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lista_compra_items" DROP COLUMN "nombresOriginales"`);
    await queryRunner.query(`ALTER TABLE "lista_compra_items" DROP COLUMN "reglas"`);
    await queryRunner.query(`ALTER TABLE "lista_compra_items" DROP COLUMN "comprado"`);
    await queryRunner.query(`ALTER TABLE "lista_compra_items" DROP COLUMN "categoria"`);
    await queryRunner.query(`ALTER TABLE "lista_compra_items" DROP COLUMN "terminoCatalogo"`);
    await queryRunner.query(
      `ALTER TABLE "listas_compra" DROP CONSTRAINT "UQ_listas_compra_usuario_semana"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_comidas_usuario_semana"`);
    await queryRunner.query(`ALTER TABLE "comidas" DROP COLUMN "notas"`);
    await queryRunner.query(`ALTER TABLE "comidas" DROP COLUMN "porciones"`);
    await queryRunner.query(`ALTER TABLE "comidas" DROP COLUMN "tipo"`);
    await queryRunner.query(`ALTER TABLE "comidas" DROP COLUMN "semana"`);
  }
}
