/**
 * File: libs/default-theme/theme/pages/product.tsx
 * Module: default-theme
 * Purpose: Product template (handle-based) rendered by storefront routing
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import React from 'react';
import { Money, ProductCard, ThemeNodeRenderer, useProducts } from '@web-builder/theme-sdk';
import type { PageNode } from '@web-builder/contracts';

export default function ProductPage({ handle, layout }: { handle?: string; layout?: any }) {
  const products = useProducts();
  const product = handle ? products.find((p) => p.handle === handle) : products[0];

  if (!product) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Product not found</h1>
        <div style={{ opacity: 0.7, marginTop: 8 }}>handle={handle || '—'}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      {layout && typeof layout === 'object' ? <ThemeNodeRenderer node={layout as PageNode} /> : null}
      <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>{product.title}</h1>
      <div style={{ marginTop: 10, fontSize: 18 }}>
        <Money cents={product.priceCents} currency={product.currency} />
      </div>
      <div style={{ marginTop: 18 }}>
        <ProductCard product={product} />
      </div>
      <div style={{ marginTop: 24, opacity: 0.7, fontSize: 13 }}>
        Try another: <a href="/products/demo-product">/products/demo-product</a>
      </div>
    </div>
  );
}

