/**
 * @file page.entity.ts
 * @module sites
 * @description Page entity definition
 * @author BharatERP
 * @created 2025-02-09
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Site } from './site.entity';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column({ type: 'jsonb', default: {} })
  content: Record<string, any>;

  @Column({ name: 'site_id' })
  siteId: string;

  @ManyToOne(() => Site, (site) => site.pages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

