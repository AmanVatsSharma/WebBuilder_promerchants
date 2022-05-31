/**
 * File: libs/default-theme/theme/pages/home.tsx
 * Module: default-theme
 * Purpose: Homepage template (hero + product grid)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import React from 'react';
import { Money, ProductCard, ThemeNodeRenderer, useProducts } from '@web-builder/theme-sdk';
import type { PageNode } from '@web-builder/contracts';

export default function HomePage({ layout }: { layout?: any }) {
  const products = useProducts();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      {/* Theme-driven layout (draft/published) if provided by storefront */}
      {layout && typeof layout === 'object' ? <ThemeNodeRenderer node={layout as PageNode} /> : null}

      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Featured products</h2>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            {products?.[0] ? (
              <span>
                Starting at <Money cents={products[0].priceCents} currency={products[0].currency} />
              </span>
            ) : (
              <span>No products yet</span>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}


