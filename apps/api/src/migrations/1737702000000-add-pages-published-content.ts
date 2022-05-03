/**
 * File: apps/api/src/migrations/1737702000000-add-pages-published-content.ts
 * Module: app/migrations
 * Purpose: Add published content columns to pages (draft vs published page publishing)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Production should run migrations (synchronize=false). Dev can still rely on synchronize.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPagesPublishedContent1737702000000 implements MigrationInterface {
  name = 'AddPagesPublishedContent1737702000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns if they don't exist yet
    await queryRunner.query(`
      ALTER TABLE "pages"
      ADD COLUMN IF NOT EXISTS "publishedContent" jsonb;
    `);
    await queryRunner.query(`
      ALTER TABLE "pages"
      ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN IF EXISTS "publishedAt";`);
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN IF EXISTS "publishedContent";`);
  }
}

