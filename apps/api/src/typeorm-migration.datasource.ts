/**
 * @file typeorm-migration.datasource.ts
 * @module app
 * @description Dedicated TypeORM DataSource for migration CLI operations
 * @author BharatERP
 * @created 2026-02-16
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'webbuilder',
  entities: [process.cwd() + '/apps/api/src/modules/**/entities/*.entity{.ts,.js}'],
  migrations: [process.cwd() + '/apps/api/src/migrations/*{.ts,.js}'],
});

