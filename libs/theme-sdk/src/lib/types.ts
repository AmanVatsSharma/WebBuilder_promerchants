/**
 * File: libs/theme-sdk/src/lib/types.ts
 * Module: theme-sdk
 * Purpose: Shared types used by theme authors
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - These are minimal for now; will expand with full commerce models later
 */

import type React from 'react';

export interface ThemeSite {
  id: string;
  name: string;
  domain?: string | null;
  currency?: string;
}

export interface ThemeProduct {
  id: string;
  title: string;
  handle: string;
  description?: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
}

export interface ThemeCartLine {
  productId: string;
  quantity: number;
}

export interface ThemeCart {
  lines: ThemeCartLine[];
  currency: string;
}

export interface CommerceAdapter {
  getSite(): Promise<ThemeSite>;
  listProducts(): Promise<ThemeProduct[]>;
  getCart(): Promise<ThemeCart>;
  addToCart(productId: string, quantity: number): Promise<ThemeCart>;
}

/**
 * Extension blocks (\"App Blocks\") available to themes at runtime.
 * - Keys are block `type` strings.
 * - Values are React components exported by extension bundles.
 */
export type ThemeExtensionBlocks = Record<string, React.ComponentType<any>>;


