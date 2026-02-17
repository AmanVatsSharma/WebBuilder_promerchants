/**
 * @file workspace-membership.entity.ts
 * @module identity
 * @description Workspace membership bridge linking users to workspaces and roles
 * @author BharatERP
 * @created 2026-02-16
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('workspace_memberships')
@Index('IDX_workspace_memberships_unique_user_workspace', ['userId', 'workspaceId'], { unique: true })
export class WorkspaceMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({ default: 'OWNER' })
  role: 'OWNER' | 'ADMIN' | 'MEMBER';

  @CreateDateColumn({ type: dateType() })
  createdAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

