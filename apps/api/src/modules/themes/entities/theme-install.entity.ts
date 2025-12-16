/**
 * File: apps/api/src/modules/themes/entities/theme-install.entity.ts
 * Module: themes
 * Purpose: Site -> Theme installation and draft/published selection
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - This binds a Site to the ThemeVersion it is currently editing (draft) and the one published
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('theme_installs')
@Index(['siteId'], { unique: true })
export class ThemeInstall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ name: 'theme_id' })
  themeId: string;

  @Column({ name: 'draft_theme_version_id', nullable: true })
  draftThemeVersionId?: string | null;

  @Column({ name: 'published_theme_version_id', nullable: true })
  publishedThemeVersionId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


