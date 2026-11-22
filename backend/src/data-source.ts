import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * DataSource exclusivo para la CLI de TypeORM (migration:run, migration:revert,
 * migration:generate, migration:check). La aplicacion NestJS configura su propia
 * conexion en app.module.ts; esta debe mantenerse equivalente en entidades y
 * migraciones.
 *
 * synchronize va siempre en false: la estructura de la base solo debe cambiar
 * mediante migraciones. Ver docs/migraciones-y-auditoria.md.
 */
const databaseUrl = process.env.DATABASE_URL;

const conexion = databaseUrl
  ? { url: databaseUrl }
  : {
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    };

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...conexion,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
