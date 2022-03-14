/**
 * File: apps/api/src/modules/themes/entities/theme-build-job.entity.ts
 * Module: themes
 * Purpose: Durable ledger for theme build jobs (producer/worker observability + idempotency)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - BullMQ keeps job execution state; this table is the durable business record and API surface.
 * - Idempotency is enforced in service logic by allowing only one active job per themeVersionId.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ThemeVersion } from './theme-version.entity';

export type ThemeBuildJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

function dateType() {
  // sql.js follows sqlite column types; Postgres supports timestamptz.
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('theme_build_jobs')
@Index(['themeVersionId', 'status'])
export class ThemeBuildJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'theme_version_id' })
  themeVersionId: string;

  @ManyToOne(() => ThemeVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theme_version_id' })
  themeVersion: ThemeVersion;

  @Column({ type: 'varchar', default: 'QUEUED' })
  status: ThemeBuildJobStatus;

  @Column({ type: 'int', default: 0 })
  attempt: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ type: dateType(), nullable: true })
  startedAt?: Date | null;

  @Column({ type: dateType(), nullable: true })
  finishedAt?: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMs?: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'text', nullable: true })
  errorStack?: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  bullJobId?: string | null;

  @CreateDateColumn({ type: dateType() })
  queuedAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

