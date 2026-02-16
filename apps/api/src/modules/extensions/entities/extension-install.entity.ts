/**
 * @file extension-install.entity.ts
 * @module extensions
 * @description Site binding for installed extensions (app blocks)
 * @author BharatERP
 * @created 2026-01-24
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

function booleanType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'boolean' : 'bool') as any;
}

@Entity('extension_installs')
@Index(['siteId', 'extensionId'], { unique: true })
export class ExtensionInstall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ name: 'extension_id' })
  extensionId: string;

  @Column({ name: 'extension_version_id' })
  extensionVersionId: string;

  @Column({ type: booleanType(), default: true })
  enabled: boolean;

  @CreateDateColumn({ type: dateType() })
  installedAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

