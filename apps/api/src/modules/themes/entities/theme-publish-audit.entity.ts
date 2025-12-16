/**
 * File: apps/api/src/modules/themes/entities/theme-publish-audit.entity.ts
 * Module: themes
 * Purpose: Audit log for theme publish/rollback actions per site
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('theme_publish_audits')
export class ThemePublishAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ name: 'from_theme_version_id', nullable: true })
  fromThemeVersionId?: string | null;

  @Column({ name: 'to_theme_version_id' })
  toThemeVersionId: string;

  @Column({ type: 'varchar', default: 'system' })
  actor: string;

  @Column({ type: 'varchar' })
  action: 'PUBLISH' | 'ROLLBACK';

  @CreateDateColumn()
  createdAt: Date;
}


