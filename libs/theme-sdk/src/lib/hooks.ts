/**
 * File: libs/theme-sdk/src/lib/hooks.ts
 * Module: theme-sdk
 * Purpose: Convenience hooks for theme authors
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import { useThemeSdk } from './theme-sdk';

export function useSite() {
  return useThemeSdk().site;
}

export function useProducts() {
  return useThemeSdk().products;
}

export function useCart() {
  return useThemeSdk().cart;
}


