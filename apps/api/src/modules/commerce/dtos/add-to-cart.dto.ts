/**
 * File: apps/api/src/modules/commerce/dtos/add-to-cart.dto.ts
 * Module: commerce
 * Purpose: DTO for adding an item to cart
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { IsInt, IsPositive, IsString } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

