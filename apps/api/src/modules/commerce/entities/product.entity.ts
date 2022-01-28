/**
 * File: apps/api/src/modules/commerce/entities/product.entity.ts
 * Module: commerce
 * Purpose: Product catalog entity (minimal v1)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('commerce_products')
@Index(['siteId', 'handle'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column()
  title: string;

  @Column()
  handle: string;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

