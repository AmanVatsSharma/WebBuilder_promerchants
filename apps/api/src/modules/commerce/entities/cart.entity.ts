/**
 * File: apps/api/src/modules/commerce/entities/cart.entity.ts
 * Module: commerce
 * Purpose: Cart entity (single active cart per site for v1)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CartLine = { productId: string; quantity: number };

@Entity('commerce_carts')
@Index(['siteId'], { unique: true })
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  lines: CartLine[];

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

