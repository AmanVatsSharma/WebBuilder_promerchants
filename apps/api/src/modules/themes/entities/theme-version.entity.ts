/**
 * File: apps/api/src/modules/themes/entities/theme-version.entity.ts
 * Module: themes
 * Purpose: Theme version entity (immutable publishable snapshot)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - ThemeVersion corresponds to an uploaded bundle + extracted source files
 * - Build pipeline later produces compiled artifacts tracked by status/logs
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Theme } from './theme.entity';
import { ThemeFile } from './theme-file.entity';

export type ThemeVersionStatus = 'DRAFT' | 'QUEUED' | 'BUILDING' | 'BUILT' | 'PUBLISHED' | 'FAILED';

@Entity('theme_versions')
export class ThemeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'theme_id' })
  themeId: string;

  @ManyToOne(() => Theme, (t) => t.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theme_id' })
  theme: Theme;

  @Column()
  version: string;

  @Column({ type: 'varchar', default: 'DRAFT' })
  status: ThemeVersionStatus;

  @Column({
    type: (process.env.DB_TYPE === 'sqljs' ? 'simple-json' : 'jsonb') as any,
    nullable: true,
  })
  manifest?: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  buildLog?: string | null;

  @OneToMany(() => ThemeFile, (f) => f.themeVersion, { cascade: true })
  files: ThemeFile[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


