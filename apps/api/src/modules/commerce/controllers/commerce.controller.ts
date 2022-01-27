/**
 * File: apps/api/src/modules/commerce/controllers/commerce.controller.ts
 * Module: commerce
 * Purpose: Commerce HTTP endpoints (products + cart)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommerceService } from '../services/commerce.service';
import { AddToCartDto } from '../dtos/add-to-cart.dto';

@Controller('commerce')
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('sites/:siteId/products')
  listProducts(@Param('siteId') siteId: string) {
    return this.commerce.listProducts(siteId);
  }

  @Post('sites/:siteId/products/seed')
  seed(@Param('siteId') siteId: string) {
    return this.commerce.seedDemoProducts(siteId);
  }

  @Get('sites/:siteId/cart')
  getCart(@Param('siteId') siteId: string) {
    return this.commerce.getCart(siteId);
  }

  @Post('sites/:siteId/cart/lines')
  addLine(@Param('siteId') siteId: string, @Body() dto: AddToCartDto) {
    return this.commerce.addToCart(siteId, dto.productId, dto.quantity);
  }
}

