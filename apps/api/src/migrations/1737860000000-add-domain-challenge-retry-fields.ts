/**
 * File: apps/api/src/migrations/1737860000000-add-domain-challenge-retry-fields.ts
 * Module: app/migrations
 * Purpose: Add retry scheduling fields to domain verification challenges
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDomainChallengeRetryFields1737860000000 implements MigrationInterface {
  name = 'AddDomainChallengeRetryFields1737860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "attemptCount" integer NOT NULL DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "maxAttempts" integer NOT NULL DEFAULT 5;
    `);
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMPTZ;
    `);
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMPTZ;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_domain_verification_challenges_next_attempt"
      ON "domain_verification_challenges" ("nextAttemptAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_verification_challenges_next_attempt";`);
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "lastAttemptAt";`);
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "nextAttemptAt";`);
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "maxAttempts";`);
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "attemptCount";`);
  }
}

