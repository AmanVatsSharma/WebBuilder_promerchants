/**
 * File: apps/api/src/migrations/1737865000000-create-auth-sessions.ts
 * Module: app/migrations
 * Purpose: Create auth session table for refresh token rotation and revocation
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSessions1737865000000 implements MigrationInterface {
  name = 'CreateAuthSessions1737865000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "workspaceIds" text NOT NULL,
        "refresh_token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_auth_sessions_refresh_token_hash"
      ON "auth_sessions" ("refresh_token_hash");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_sessions_user_id"
      ON "auth_sessions" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_auth_sessions_user_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_auth_sessions_refresh_token_hash";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions";`);
  }
}

