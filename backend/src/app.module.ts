import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { IngredientsModule } from './ingredients/ingredients.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const esProduccion = config.get<string>('NODE_ENV') === 'production';

        // Algunos proveedores administrados (ej. Render) solo entregan una
        // connection string completa, no host/usuario/password por separado.
        const databaseUrl = config.get<string>('DATABASE_URL');
        const connectionOptions = databaseUrl
          ? { url: databaseUrl }
          : {
              host: config.get<string>('DATABASE_HOST', 'localhost'),
              port: parseInt(config.get<string>('DATABASE_PORT', '5432'), 10),
              username: config.get<string>('DATABASE_USER'),
              password: config.get<string>('DATABASE_PASSWORD'),
              database: config.get<string>('DATABASE_NAME'),
            };

        return {
          type: 'postgres' as const,
          ...connectionOptions,
          autoLoadEntities: true,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          // synchronize y migrationsRun no pueden convivir: TypeORM corre
          // synchronize() antes que las migraciones, así que si ambos están
          // activos, la migración inicial choca con "la tabla ya existe".
          // En desarrollo, synchronize agiliza iterar sobre entidades nuevas;
          // en producción la única fuente de verdad del esquema son las
          // migraciones.
          migrationsRun: esProduccion,
          synchronize: !esProduccion,
        };
      },
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    IngredientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
