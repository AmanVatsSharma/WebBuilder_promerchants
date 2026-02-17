/**
 * File: apps/api/src/migrations/1737810000000-add-site-owner-id.ts
 * Module: app/migrations
 * Purpose: Add owner_id to sites for ownership authorization
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteOwnerId1737810000000 implements MigrationInterface {
  name = 'AddSiteOwnerId1737810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sites"
      ADD COLUMN IF NOT EXISTS "ownerId" character varying;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sites_ownerId" ON "sites" ("ownerId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sites_ownerId";`);
    await queryRunner.query(`
      ALTER TABLE "sites"
      DROP COLUMN IF EXISTS "ownerId";
    `);
  }
}

