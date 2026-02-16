/**
 * @file user.entity.ts
 * @module identity
 * @description User identity entity for authentication and tenant ownership
 * @author BharatERP
 * @created 2026-02-16
 */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

function dateType() {
  return (process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz') as any;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true })
  name?: string | null;

  @CreateDateColumn({ type: dateType() })
  createdAt: Date;

  @UpdateDateColumn({ type: dateType() })
  updatedAt: Date;
}

