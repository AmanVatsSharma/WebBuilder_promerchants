/**
 * @file extension-version.entity.ts
 * @module extensions
 * @description Extension version entity (uploaded snapshot + build status)
 * @author BharatERP
 * @created 2026-01-24
 */

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Extension } from './extension.entity';

export type ExtensionVersionStatus = 'DRAFT' | 'BUILDING' | 'BUILT' | 'FAILED';

@Entity('extension_versions')
@Index(['extensionId', 'version'], { unique: false })
export class ExtensionVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'extension_id' })
  extensionId: string;

  @ManyToOne(() => Extension, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extension_id' })
  extension: Extension;

  @Column()
  version: string;

  @Column({ type: 'varchar', default: 'DRAFT' })
  status: ExtensionVersionStatus;

  @Column({ type: (process.env.DB_TYPE === 'sqljs' ? 'simple-json' : 'jsonb') as any, nullable: true })
  manifest?: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  buildLog?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

