/**
 * File: apps/api/src/migrations/1737600000000-initialize-core-platform.ts
 * Module: app/migrations
 * Purpose: Bootstrap core platform tables for sites/domains/themes/commerce
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 * Notes:
 * - Uses IF NOT EXISTS to stay compatible with existing dev databases.
 * - Complements later feature migrations (theme_build_jobs, extensions, etc.).
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeCorePlatform1737600000000 implements MigrationInterface {
  name = 'InitializeCorePlatform1737600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "domain" character varying,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sites_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "content" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "publishedContent" jsonb,
        "publishedAt" TIMESTAMPTZ,
        "site_id" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pages_site_id" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "domain_mappings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "host" character varying NOT NULL,
        "site_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "lastError" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_domain_mappings_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_domain_mappings_host" ON "domain_mappings" ("host");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "themes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" text,
        "author" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_themes_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_id" uuid NOT NULL,
        "version" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'DRAFT',
        "manifest" jsonb,
        "buildLog" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_versions_theme_id" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_files" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_version_id" uuid NOT NULL,
        "path" character varying NOT NULL,
        "size" integer NOT NULL DEFAULT 0,
        "sha256" character varying,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_files_theme_version_id" FOREIGN KEY ("theme_version_id") REFERENCES "theme_versions"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_theme_files_version_path" ON "theme_files" ("theme_version_id", "path");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_installs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "theme_id" uuid NOT NULL,
        "draft_theme_version_id" uuid,
        "published_theme_version_id" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_installs_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_theme_installs_site_id" ON "theme_installs" ("site_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_publish_audits" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "from_theme_version_id" uuid,
        "to_theme_version_id" uuid NOT NULL,
        "actor" character varying NOT NULL DEFAULT 'system',
        "action" character varying NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_publish_audits_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commerce_products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "title" character varying NOT NULL,
        "handle" character varying NOT NULL,
        "price_cents" integer NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "image_url" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commerce_products_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_commerce_products_site_handle" ON "commerce_products" ("site_id", "handle");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commerce_carts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "site_id" uuid NOT NULL,
        "lines" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commerce_carts_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_commerce_carts_site_id" ON "commerce_carts" ("site_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commerce_carts_site_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commerce_carts";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commerce_products_site_handle";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commerce_products";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "theme_publish_audits";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_theme_installs_site_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_installs";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_theme_files_version_path";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_files";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "theme_versions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "themes";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_mappings_host";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "domain_mappings";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "pages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sites";`);
  }
}

