/**
 * File: apps/api/src/migrations/1737820000000-add-theme-marketplace-metadata.ts
 * Module: app/migrations
 * Purpose: Add marketplace pricing and listing metadata columns on themes
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemeMarketplaceMetadata1737820000000 implements MigrationInterface {
  name = 'AddThemeMarketplaceMetadata1737820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "pricingModel" character varying NOT NULL DEFAULT 'FREE';
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "priceCents" integer;
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "currency" character varying(3) NOT NULL DEFAULT 'USD';
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "licenseType" character varying NOT NULL DEFAULT 'SINGLE_STORE';
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "isListed" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "themes" DROP COLUMN IF EXISTS "isListed";`);
    await queryRunner.query(`ALTER TABLE "themes" DROP COLUMN IF EXISTS "licenseType";`);
    await queryRunner.query(`ALTER TABLE "themes" DROP COLUMN IF EXISTS "currency";`);
    await queryRunner.query(`ALTER TABLE "themes" DROP COLUMN IF EXISTS "priceCents";`);
    await queryRunner.query(`ALTER TABLE "themes" DROP COLUMN IF EXISTS "pricingModel";`);
  }
}

