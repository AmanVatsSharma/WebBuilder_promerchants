/**
 * File: apps/api/src/migrations/1737875000000-create-domain-challenge-alerts.ts
 * Module: app/migrations
 * Purpose: Persist domain challenge alert delivery records for operations observability
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDomainChallengeAlerts1737875000000 implements MigrationInterface {
  name = 'CreateDomainChallengeAlerts1737875000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "domain_challenge_alerts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "challenge_id" uuid NOT NULL,
        "mapping_id" uuid NOT NULL,
        "severity" character varying NOT NULL,
        "eventType" character varying NOT NULL,
        "message" text NOT NULL,
        "payload" text,
        "delivered" boolean NOT NULL DEFAULT false,
        "deliveryStatusCode" integer,
        "deliveryError" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_domain_challenge_alerts_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_domain_challenge_alerts_challenge_id"
      ON "domain_challenge_alerts" ("challenge_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_domain_challenge_alerts_mapping_id"
      ON "domain_challenge_alerts" ("mapping_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_challenge_alerts_mapping_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_challenge_alerts_challenge_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "domain_challenge_alerts";`);
  }
}

