/**
 * File: libs/default-theme/theme/pages/home.tsx
 * Module: default-theme
 * Purpose: Homepage template (hero + product grid)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import React from 'react';
import { Money, ProductCard, useProducts } from '@web-builder/theme-sdk';

type PageNode = { id?: string; type?: string; props?: any; children?: PageNode[] };

function renderNode(node: PageNode): React.ReactNode {
  if (!node || !node.type) return null;
  if (node.type === 'Container') {
    return (
      <div>
        {(node.children || []).map((c) => (
          <React.Fragment key={c.id || Math.random()}>{renderNode(c)}</React.Fragment>
        ))}
      </div>
    );
  }
  if (node.type === 'HeroSection') {
    const title = node.props?.title || 'Welcome';
    const subtitle = node.props?.subtitle || '';
    return (
      <section
        style={{
          borderRadius: 18,
          padding: 28,
          background: 'linear-gradient(135deg,#2563eb,#60a5fa)',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.05 }}>{String(title)}</div>
        {subtitle ? (
          <div style={{ fontSize: 18, opacity: 0.9, marginTop: 12 }}>{String(subtitle)}</div>
        ) : null}
      </section>
    );
  }
  if (node.type === 'TextBlock') {
    return (
      <div style={{ padding: 18, border: '1px solid #eee', borderRadius: 14, marginTop: 14 }}>
        <div style={{ whiteSpace: 'pre-wrap' }}>{String(node.props?.text || '')}</div>
      </div>
    );
  }
  return null;
}

export default function HomePage({ layout }: { layout?: any }) {
  const products = useProducts();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      {/* Theme-driven layout (draft/published) if provided by storefront */}
      {layout && typeof layout === 'object' ? renderNode(layout as PageNode) : null}

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


