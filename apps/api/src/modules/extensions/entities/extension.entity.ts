/**
 * @file extension.entity.ts
 * @module extensions
 * @description Extension listing entity (marketplace identity)
 * @author BharatERP
 * @created 2026-01-24
 */

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('extensions')
export class Extension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', nullable: true })
  author?: string | null;

  @CreateDateColumn({ type: dateType() })
  createdAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

