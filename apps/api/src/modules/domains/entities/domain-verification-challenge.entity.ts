/**
 * File: apps/api/src/modules/domains/entities/domain-verification-challenge.entity.ts
 * Module: domains
 * Purpose: Persist domain verification challenge lifecycle and proofs
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DomainChallengeMethod = 'DNS_TXT' | 'HTTP';
export type DomainChallengeStatus = 'ISSUED' | 'VERIFIED' | 'FAILED';
export type DomainPropagationState = 'PENDING' | 'PROPAGATING' | 'READY' | 'FAILED';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('domain_verification_challenges')
export class DomainVerificationChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'domain_mapping_id' })
  domainMappingId: string;

  @Column({ type: 'varchar' })
  method: DomainChallengeMethod;

  @Column({ type: 'varchar', default: 'ISSUED' })
  status: DomainChallengeStatus;

  @Column()
  token: string;

  @Column({ type: 'text', nullable: true })
  txtRecordName?: string | null;

  @Column({ type: 'text', nullable: true })
  httpPath?: string | null;

  @Column({ type: 'text', nullable: true })
  expectedValue?: string | null;

  @Column({ type: 'varchar', nullable: true })
  provider?: string | null;

  @Column({ type: 'varchar', nullable: true })
  providerReferenceId?: string | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  propagationState: DomainPropagationState;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'int', default: 5 })
  maxAttempts: number;

  @Column({ type: dateType(), nullable: true })
  nextAttemptAt?: Date | null;

  @Column({ type: dateType(), nullable: true })
  lastAttemptAt?: Date | null;

  @Column({ type: dateType(), nullable: true })
  lastEventAt?: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  proof?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ type: dateType(), nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn({ type: dateType() })
  createdAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

