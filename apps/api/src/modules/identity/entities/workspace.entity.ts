/**
 * @file workspace.entity.ts
 * @module identity
 * @description Workspace tenant entity that groups sites and memberships
 * @author BharatERP
 * @created 2026-02-16
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  @CreateDateColumn({ type: dateType() })
  createdAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

