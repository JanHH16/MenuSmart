import { MigrationInterface, QueryRunner } from "typeorm";

export class DominioComidasProductosListas1790477928088 implements MigrationInterface {
    name = 'DominioComidasProductosListas1790477928088'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "precios_supermercado" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productoId" uuid NOT NULL, "supermercado" character varying NOT NULL, "precio" double precision NOT NULL, "fechaObtencion" TIMESTAMP NOT NULL, CONSTRAINT "PK_e5913524fec23db41ec8c0c755b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "productos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombreNormalizado" character varying NOT NULL, "categoria" character varying NOT NULL, CONSTRAINT "UQ_a665aacdaca4c3e5a66bac8f010" UNIQUE ("nombreNormalizado"), CONSTRAINT "PK_04f604609a0949a7f3b43400766" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ingredientes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "comidaId" uuid NOT NULL, "nombre" character varying NOT NULL, "cantidad" double precision NOT NULL, "unidad" character varying NOT NULL, "productoId" uuid, CONSTRAINT "PK_8901a565cc70a661928d2011f2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "comidas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuarioId" uuid NOT NULL, "nombre" character varying NOT NULL, "diaSemana" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8fda77b821b68345f4ba48e0a83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "listas_compra" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuarioId" uuid NOT NULL, "semana" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f0f15c3079161a007d01240af13" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lista_compra_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "listaCompraId" uuid NOT NULL, "nombreNormalizado" character varying NOT NULL, "cantidadTotal" double precision NOT NULL, "unidad" character varying NOT NULL, "productoId" uuid, CONSTRAINT "PK_f1243ce0512de0a57e90a703955" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "precios_supermercado" ADD CONSTRAINT "FK_08133d64dc1c554ee4d92c0559c" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ingredientes" ADD CONSTRAINT "FK_e20c1f4c9fb12f6e650282ba439" FOREIGN KEY ("comidaId") REFERENCES "comidas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ingredientes" ADD CONSTRAINT "FK_d1403dca0a19afbb3f068516435" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comidas" ADD CONSTRAINT "FK_801003b6699f00a48ae6ce377ab" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listas_compra" ADD CONSTRAINT "FK_e6084c36344fb27e17a751ad921" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lista_compra_items" ADD CONSTRAINT "FK_4907a757b58ceacb6936f07e02f" FOREIGN KEY ("listaCompraId") REFERENCES "listas_compra"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lista_compra_items" ADD CONSTRAINT "FK_b5fe87a199d32b05cf205fa7644" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lista_compra_items" DROP CONSTRAINT "FK_b5fe87a199d32b05cf205fa7644"`);
        await queryRunner.query(`ALTER TABLE "lista_compra_items" DROP CONSTRAINT "FK_4907a757b58ceacb6936f07e02f"`);
        await queryRunner.query(`ALTER TABLE "listas_compra" DROP CONSTRAINT "FK_e6084c36344fb27e17a751ad921"`);
        await queryRunner.query(`ALTER TABLE "comidas" DROP CONSTRAINT "FK_801003b6699f00a48ae6ce377ab"`);
        await queryRunner.query(`ALTER TABLE "ingredientes" DROP CONSTRAINT "FK_d1403dca0a19afbb3f068516435"`);
        await queryRunner.query(`ALTER TABLE "ingredientes" DROP CONSTRAINT "FK_e20c1f4c9fb12f6e650282ba439"`);
        await queryRunner.query(`ALTER TABLE "precios_supermercado" DROP CONSTRAINT "FK_08133d64dc1c554ee4d92c0559c"`);
        await queryRunner.query(`DROP TABLE "lista_compra_items"`);
        await queryRunner.query(`DROP TABLE "listas_compra"`);
        await queryRunner.query(`DROP TABLE "comidas"`);
        await queryRunner.query(`DROP TABLE "ingredientes"`);
        await queryRunner.query(`DROP TABLE "productos"`);
        await queryRunner.query(`DROP TABLE "precios_supermercado"`);
    }

}
