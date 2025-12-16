/**
 * File: libs/theme-sdk/src/lib/components.tsx
 * Module: theme-sdk
 * Purpose: Basic ecommerce UI components for themes
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Keep components dependency-light so themes remain portable
 */

import React from 'react';
import type { ThemeProduct } from './types';
import { useThemeSdk } from './theme-sdk';

export function Money({ cents, currency }: { cents: number; currency: string }) {
  const value = cents / 100;
  return (
    <span>
      {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)}
    </span>
  );
}

export function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
      {children}
    </a>
  );
}

export function Image({ src, alt }: { src: string; alt?: string }) {
  return <img src={src} alt={alt || ''} style={{ width: '100%', height: 'auto', display: 'block' }} />;
}

export function Header() {
  const { site } = useThemeSdk();
  return (
    <header style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
      <strong>{site?.name || 'Store'}</strong>
      <nav style={{ display: 'flex', gap: 12 }}>
        <a href="/">Home</a>
        <a href="/products">Products</a>
        <a href="/cart">Cart</a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer style={{ padding: 24, borderTop: '1px solid #eee', marginTop: 32, opacity: 0.7 }}>
      <div>Powered by WebBuilder</div>
    </footer>
  );
}

export function ProductCard({ product }: { product: ThemeProduct }) {
  const { commerce } = useThemeSdk();
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
      {product.imageUrl && <Image src={product.imageUrl} alt={product.title} />}
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{product.title}</div>
        <div style={{ marginBottom: 8 }}>
          <Money cents={product.priceCents} currency={product.currency} />
        </div>
        <button
          onClick={() => {
            console.debug('[theme-sdk] addToCart', { productId: product.id });
            void commerce.addToCart(product.id, 1);
          }}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}


