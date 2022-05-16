/**
 * File: apps/api/src/migrations/1737705000000-create-extensions.ts
 * Module: app/migrations
 * Purpose: Create extensions tables (extensions, extension_versions, extension_installs)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Production should run migrations (synchronize=false). Dev can still rely on synchronize.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtensions1737705000000 implements MigrationInterface {
  name = 'CreateExtensions1737705000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "extensions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" text,
        "author" character varying,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_extensions_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "extension_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "extension_id" uuid NOT NULL,
        "version" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'DRAFT',
        "manifest" jsonb,
        "buildLog" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_extension_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_extension_versions_extension_id" FOREIGN KEY ("extension_id") REFERENCES "extensions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "extension_installs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "extension_id" uuid NOT NULL,
        "extension_version_id" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "installedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_extension_installs_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_extension_installs_site_extension" ON "extension_installs" ("site_id", "extension_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_extension_installs_site_extension";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "extension_installs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "extension_versions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "extensions";`);
  }
}

