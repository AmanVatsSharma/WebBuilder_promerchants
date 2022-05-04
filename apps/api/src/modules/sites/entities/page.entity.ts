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

  @Column({
    // Keep Postgres-optimized jsonb in real deployments, but allow sqljs for e2e/CI.
    type: (process.env.DB_TYPE === 'sqljs' ? 'simple-json' : 'jsonb') as any,
    default: () => "'{}'",
  })
  content: Record<string, any>;

  /**
   * Published snapshot of the page content (what storefront serves by default).
   * Draft remains in `content` to keep backwards compatibility with the builder editor.
   */
  @Column({
    type: (process.env.DB_TYPE === 'sqljs' ? 'simple-json' : 'jsonb') as any,
    nullable: true,
  })
  publishedContent?: Record<string, any> | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

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

