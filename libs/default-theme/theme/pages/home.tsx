/**
 * File: libs/default-theme/theme/pages/home.tsx
 * Module: default-theme
 * Purpose: Homepage template (hero + product grid)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import React from 'react';
import { Money, ProductCard, useProducts } from '@web-builder/theme-sdk';

export default function HomePage() {
  const products = useProducts();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <section
        style={{
          borderRadius: 18,
          padding: 28,
          background: 'linear-gradient(135deg,#2563eb,#60a5fa)',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.05 }}>Build. Publish. Sell.</div>
        <div style={{ fontSize: 18, opacity: 0.9, marginTop: 12 }}>
          A default ecommerce theme designed for speed and conversion.
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="/products"
            style={{
              background: '#fff',
              color: '#111',
              padding: '10px 14px',
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Shop products
          </a>
          <a
            href="/"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            Learn more
          </a>
        </div>
      </section>

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


