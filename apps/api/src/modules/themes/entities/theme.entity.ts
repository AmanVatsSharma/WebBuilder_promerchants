/**
 * File: apps/api/src/modules/themes/entities/theme.entity.ts
 * Module: themes
 * Purpose: Theme entity (Theme Store item)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - A Theme can have many ThemeVersions
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ThemeVersion } from './theme-version.entity';

@Entity('themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  author?: string | null;

  @Column({ default: 'FREE' })
  pricingModel: 'FREE' | 'PAID';

  @Column({ type: 'int', nullable: true })
  priceCents?: number | null;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ default: 'SINGLE_STORE' })
  licenseType: string;

  @Column({ default: false })
  isListed: boolean;

  @OneToMany(() => ThemeVersion, (v) => v.theme, { cascade: true })
  versions: ThemeVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


