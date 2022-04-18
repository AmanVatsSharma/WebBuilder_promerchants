/**
 * @file worker.module.ts
 * @module app
 * @description Worker application module (no HTTP server) for BullMQ processors
 * @author BharatERP
 * @created 2026-01-24
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../shared/logger/logger.module';
import { ThemesWorkerModule } from '../modules/themes/themes.worker.module';

@Module({
  imports: [
    LoggerModule,
    ThemesWorkerModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        // For CI/e2e we support a pure-JS in-memory DB (sql.js) to avoid external Postgres dependency.
        // Default remains Postgres for real deployments.
        if (process.env.DB_TYPE === 'sqljs') {
          return {
            type: 'sqljs',
            autoSave: false,
            location: ':memory:',
            entities: [],
            autoLoadEntities: true,
            synchronize: true,
          } as const;
        }

        return {
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'webbuilder',
          entities: [],
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production', // true for dev
        } as const;
      },
    }),
  ],
})
export class WorkerModule {}

