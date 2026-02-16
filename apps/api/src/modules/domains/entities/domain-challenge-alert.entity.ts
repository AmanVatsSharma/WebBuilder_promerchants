/**
 * File: apps/api/src/modules/domains/entities/domain-challenge-alert.entity.ts
 * Module: domains
 * Purpose: Persist domain challenge alert delivery history for ops observability
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('domain_challenge_alerts')
export class DomainChallengeAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'challenge_id' })
  challengeId: string;

  @Index()
  @Column({ name: 'mapping_id' })
  mappingId: string;

  @Column({ type: 'varchar' })
  severity: 'INFO' | 'WARN' | 'ERROR';

  @Column({ type: 'varchar' })
  eventType: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'simple-json', nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({ default: false })
  delivered: boolean;

  @Column({ type: 'int', nullable: true })
  deliveryStatusCode?: number | null;

  @Column({ type: 'text', nullable: true })
  deliveryError?: string | null;

  @CreateDateColumn({ type: dateType() })
  createdAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

