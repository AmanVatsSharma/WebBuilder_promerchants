/**
 * @file auth-session.entity.ts
 * @module identity
 * @description Refresh-token backed auth session storage for token rotation/revocation
 * @author BharatERP
 * @created 2026-02-16
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('auth_sessions')
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'simple-json' })
  workspaceIds: string[];

  @Index({ unique: true })
  @Column({ name: 'refresh_token_hash' })
  refreshTokenHash: string;

  @Column({ type: dateType(), name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: dateType(), name: 'revoked_at', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn({ type: dateType() })
  createdAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

