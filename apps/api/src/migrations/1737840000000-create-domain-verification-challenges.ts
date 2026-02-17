/**
 * File: apps/api/src/migrations/1737840000000-create-domain-verification-challenges.ts
 * Module: app/migrations
 * Purpose: Persist domain verification challenge lifecycle and proof artifacts
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDomainVerificationChallenges1737840000000 implements MigrationInterface {
  name = 'CreateDomainVerificationChallenges1737840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "domain_verification_challenges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "domain_mapping_id" uuid NOT NULL,
        "method" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'ISSUED',
        "token" character varying NOT NULL,
        "txtRecordName" text,
        "httpPath" text,
        "expectedValue" text,
        "proof" text,
        "lastError" text,
        "verifiedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_domain_verification_challenges_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_domain_verification_challenges_mapping" FOREIGN KEY ("domain_mapping_id") REFERENCES "domain_mappings"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_domain_verification_challenges_domain_mapping_id"
      ON "domain_verification_challenges" ("domain_mapping_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_domain_verification_challenges_domain_mapping_id";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "domain_verification_challenges";`);
  }
}

