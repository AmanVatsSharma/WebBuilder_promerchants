/**
 * File: apps/api/src/migrations/1737870000000-add-domain-challenge-provider-fields.ts
 * Module: app/migrations
 * Purpose: Add provider webhook and propagation tracking fields to domain challenges
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDomainChallengeProviderFields1737870000000 implements MigrationInterface {
  name = 'AddDomainChallengeProviderFields1737870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "provider" character varying;
    `);
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "providerReferenceId" character varying;
    `);
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "propagationState" character varying NOT NULL DEFAULT 'PENDING';
    `);
    await queryRunner.query(`
      ALTER TABLE "domain_verification_challenges"
      ADD COLUMN IF NOT EXISTS "lastEventAt" TIMESTAMPTZ;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "lastEventAt";`);
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "propagationState";`);
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "providerReferenceId";`);
    await queryRunner.query(`ALTER TABLE "domain_verification_challenges" DROP COLUMN IF EXISTS "provider";`);
  }
}

