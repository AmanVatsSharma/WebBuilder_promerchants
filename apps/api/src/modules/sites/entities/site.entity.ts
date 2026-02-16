/**
 * @file site.entity.ts
 * @module sites
 * @description Site entity definition
 * @author BharatERP
 * @created 2025-02-09
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Page } from './page.entity';

@Entity('sites')
export class Site {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ nullable: true })
  ownerId?: string | null;

  @OneToMany(() => Page, (page) => page.site, { cascade: true })
  pages: Page[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

