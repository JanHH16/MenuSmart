import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreciosScraping1795300000000 implements MigrationInterface {
  name = 'PreciosScraping1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ejecuciones_scraping" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tienda" character varying NOT NULL, "estado" character varying NOT NULL, "iniciadaEn" TIMESTAMP WITH TIME ZONE NOT NULL, "finalizadaEn" TIMESTAMP WITH TIME ZONE, "consultasTotal" integer NOT NULL DEFAULT '0', "consultasOk" integer NOT NULL DEFAULT '0', "consultasFallidas" integer NOT NULL DEFAULT '0', "registrosExtraidos" integer NOT NULL DEFAULT '0', "registrosValidos" integer NOT NULL DEFAULT '0', "registrosDuplicados" integer NOT NULL DEFAULT '0', "registrosDescartados" integer NOT NULL DEFAULT '0', "descartesPorMotivo" jsonb NOT NULL DEFAULT '{}', "errores" jsonb NOT NULL DEFAULT '[]', "duracionMs" integer, CONSTRAINT "PK_ejecuciones_scraping" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ejecuciones_tienda_inicio" ON "ejecuciones_scraping" ("tienda", "iniciadaEn")`,
    );

    await queryRunner.query(
      `ALTER TABLE "productos" DROP CONSTRAINT "UQ_a665aacdaca4c3e5a66bac8f010"`,
    );
    await queryRunner.query(`ALTER TABLE "productos" ADD "slug" character varying`);
    await queryRunner.query(`ALTER TABLE "productos" ADD "nombre" character varying`);
    await queryRunner.query(`ALTER TABLE "productos" ADD "marca" character varying`);
    await queryRunner.query(`ALTER TABLE "productos" ADD "imagenUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "productos" ADD "cantidad" double precision`);
    await queryRunner.query(`ALTER TABLE "productos" ADD "unidad" character varying`);
    await queryRunner.query(
      `ALTER TABLE "productos" ADD CONSTRAINT "UQ_productos_slug" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_productos_nombre_normalizado" ON "productos" ("nombreNormalizado")`,
    );

    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ALTER COLUMN "fechaObtencion" TYPE TIMESTAMP WITH TIME ZONE USING "fechaObtencion" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ADD "fechaDia" date NOT NULL DEFAULT CURRENT_DATE`,
    );
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ALTER COLUMN "fechaDia" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ADD "consulta" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ALTER COLUMN "consulta" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE "precios_supermercado" ADD "precioUnitario" integer`);
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ADD "disponible" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ADD "urlProducto" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "precios_supermercado" ADD "ejecucionId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ADD CONSTRAINT "FK_precios_ejecucion" FOREIGN KEY ("ejecucionId") REFERENCES "ejecuciones_scraping"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_precios_tienda_producto_dia" ON "precios_supermercado" ("supermercado", "productoId", "fechaDia")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_precios_consulta" ON "precios_supermercado" ("consulta")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_precios_consulta"`);
    await queryRunner.query(`DROP INDEX "IDX_precios_tienda_producto_dia"`);
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" DROP CONSTRAINT "FK_precios_ejecucion"`,
    );
    await queryRunner.query(`ALTER TABLE "precios_supermercado" DROP COLUMN "ejecucionId"`);
    await queryRunner.query(`ALTER TABLE "precios_supermercado" DROP COLUMN "urlProducto"`);
    await queryRunner.query(`ALTER TABLE "precios_supermercado" DROP COLUMN "disponible"`);
    await queryRunner.query(`ALTER TABLE "precios_supermercado" DROP COLUMN "precioUnitario"`);
    await queryRunner.query(`ALTER TABLE "precios_supermercado" DROP COLUMN "consulta"`);
    await queryRunner.query(`ALTER TABLE "precios_supermercado" DROP COLUMN "fechaDia"`);
    await queryRunner.query(
      `ALTER TABLE "precios_supermercado" ALTER COLUMN "fechaObtencion" TYPE TIMESTAMP USING "fechaObtencion" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(`DROP INDEX "IDX_productos_nombre_normalizado"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP CONSTRAINT "UQ_productos_slug"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "unidad"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "cantidad"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "imagenUrl"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "marca"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "nombre"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "slug"`);
    await queryRunner.query(
      `ALTER TABLE "productos" ADD CONSTRAINT "UQ_a665aacdaca4c3e5a66bac8f010" UNIQUE ("nombreNormalizado")`,
    );

    await queryRunner.query(`DROP INDEX "IDX_ejecuciones_tienda_inicio"`);
    await queryRunner.query(`DROP TABLE "ejecuciones_scraping"`);
  }
}
