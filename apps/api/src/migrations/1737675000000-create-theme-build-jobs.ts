/**
 * File: apps/api/src/migrations/1737675000000-create-theme-build-jobs.ts
 * Module: app/migrations
 * Purpose: Create theme_build_jobs table for durable theme build job tracking
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Production should run migrations (synchronize=false). Dev can still rely on synchronize.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThemeBuildJobs1737675000000 implements MigrationInterface {
  name = 'CreateThemeBuildJobs1737675000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Needed for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_build_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_version_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'QUEUED',
        "attempt" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "startedAt" TIMESTAMPTZ,
        "finishedAt" TIMESTAMPTZ,
        "durationMs" integer,
        "errorMessage" text,
        "errorStack" text,
        "requestId" character varying,
        "bullJobId" character varying,
        "queuedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_build_jobs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_build_jobs_theme_version_id" FOREIGN KEY ("theme_version_id") REFERENCES "theme_versions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_theme_build_jobs_theme_version_status" ON "theme_build_jobs" ("theme_version_id", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_theme_build_jobs_theme_version_status";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_build_jobs";`);
  }
}

