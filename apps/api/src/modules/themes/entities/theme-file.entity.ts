/**
 * File: apps/api/src/modules/themes/entities/theme-file.entity.ts
 * Module: themes
 * Purpose: Metadata for files inside a theme version
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - File contents are stored in storage (filesystem/S3), not in DB
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ThemeVersion } from './theme-version.entity';

@Entity('theme_files')
@Index(['themeVersionId', 'path'], { unique: true })
export class ThemeFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'theme_version_id' })
  themeVersionId: string;

  @ManyToOne(() => ThemeVersion, (v) => v.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'theme_version_id' })
  themeVersion: ThemeVersion;

  @Column()
  path: string;

  @Column({ type: 'int', default: 0 })
  size: number;

  @Column({ type: 'varchar', nullable: true })
  sha256?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


