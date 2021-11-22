/**
 * File: apps/api/src/modules/domains/entities/domain-mapping.entity.ts
 * Module: domains
 * Purpose: Domain-to-site mapping for multi-tenant storefront resolution
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - `host` should be normalized (lowercase, no port)
 * - Verification flow will evolve (DNS TXT, HTTP challenge, etc.)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type DomainVerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

@Entity('domain_mappings')
export class DomainMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  host: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: DomainVerificationStatus;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


