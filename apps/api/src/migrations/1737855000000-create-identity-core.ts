/**
 * File: apps/api/src/migrations/1737855000000-create-identity-core.ts
 * Module: app/migrations
 * Purpose: Create identity core tables for users, workspaces, and memberships
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityCore1737855000000 implements MigrationInterface {
  name = 'CreateIdentityCore1737855000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "name" character varying,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspaces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspaces_slug" ON "workspaces" ("slug");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "role" character varying NOT NULL DEFAULT 'OWNER',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_memberships_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspace_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_memberships_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspace_memberships_unique_user_workspace"
      ON "workspace_memberships" ("user_id", "workspace_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_memberships_workspace_id"
      ON "workspace_memberships" ("workspace_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_memberships_workspace_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_memberships_unique_user_workspace";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_memberships";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspaces_slug";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspaces";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}

