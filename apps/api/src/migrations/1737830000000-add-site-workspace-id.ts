/**
 * File: apps/api/src/migrations/1737830000000-add-site-workspace-id.ts
 * Module: app/migrations
 * Purpose: Add workspaceId on sites for workspace-level authorization
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteWorkspaceId1737830000000 implements MigrationInterface {
  name = 'AddSiteWorkspaceId1737830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sites"
      ADD COLUMN IF NOT EXISTS "workspaceId" character varying;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sites_workspaceId" ON "sites" ("workspaceId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sites_workspaceId";`);
    await queryRunner.query(`
      ALTER TABLE "sites"
      DROP COLUMN IF EXISTS "workspaceId";
    `);
  }
}

