/**
 * File: apps/api/src/modules/commerce/commerce.module.ts
 * Module: commerce
 * Purpose: Nest module for commerce (products + cart)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommerceController } from './controllers/commerce.controller';
import { CommerceService } from './services/commerce.service';
import { Product } from './entities/product.entity';
import { Cart } from './entities/cart.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Cart])],
  controllers: [CommerceController],
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}

