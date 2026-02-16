/**
 * File: apps/storefront/src/lib/commerce-adapter.ts
 * Module: storefront
 * Purpose: CommerceAdapter implementation backed by the Nest API (products + cart)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Designed to be replaced later by a headless commerce adapter
 */

import type { CommerceAdapter, ThemeCart, ThemeProduct, ThemeSite } from '@web-builder/theme-sdk';

function apiBase() {
  return process.env.API_BASE_URL || 'http://localhost:3000/api';
}

function requestHeaders(siteId: string, extra?: HeadersInit) {
  const apiKey = process.env.API_AUTH_KEY;
  const actorId = process.env.API_ACTOR_ID;
  return {
    'x-site-id': siteId,
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(actorId ? { 'x-actor-id': actorId } : {}),
    ...(extra || {}),
  };
}

async function jsonOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[storefront-commerce] request failed', { label, status: res.status, text });
    throw new Error(`${label} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function createApiCommerceAdapter(siteId: string): CommerceAdapter {
  return {
    async getSite(): Promise<ThemeSite> {
      console.debug('[storefront-commerce] getSite', { siteId });
      const res = await fetch(`${apiBase()}/sites/${encodeURIComponent(siteId)}`, {
        cache: 'no-store',
        headers: requestHeaders(siteId),
      });
      const site = await jsonOrThrow<any>(res, 'getSite');
      return { id: site.id, name: site.name, domain: site.domain ?? null, currency: 'USD' };
    },
    async listProducts(): Promise<ThemeProduct[]> {
      console.debug('[storefront-commerce] listProducts', { siteId });
      const res = await fetch(`${apiBase()}/commerce/sites/${encodeURIComponent(siteId)}/products`, {
        cache: 'no-store',
        headers: requestHeaders(siteId),
      });
      const products = await jsonOrThrow<any[]>(res, 'listProducts');
      return (products || []).map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        priceCents: p.priceCents,
        currency: p.currency || 'USD',
        imageUrl: p.imageUrl ?? undefined,
      }));
    },
    async getCart(): Promise<ThemeCart> {
      console.debug('[storefront-commerce] getCart', { siteId });
      const res = await fetch(`${apiBase()}/commerce/sites/${encodeURIComponent(siteId)}/cart`, {
        cache: 'no-store',
        headers: requestHeaders(siteId),
      });
      const cart = await jsonOrThrow<any>(res, 'getCart');
      return { lines: cart.lines || [], currency: cart.currency || 'USD' };
    },
    async addToCart(productId: string, quantity: number): Promise<ThemeCart> {
      console.debug('[storefront-commerce] addToCart', { siteId, productId, quantity });
      const res = await fetch(`${apiBase()}/commerce/sites/${encodeURIComponent(siteId)}/cart/lines`, {
        method: 'POST',
        headers: requestHeaders(siteId, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ productId, quantity }),
      });
      const cart = await jsonOrThrow<any>(res, 'addToCart');
      return { lines: cart.lines || [], currency: cart.currency || 'USD' };
    },
  };
}

