/**
 * File: libs/theme-sdk/src/lib/theme-sdk.tsx
 * Module: theme-sdk
 * Purpose: Theme SDK provider + baseline components for ecommerce themes
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - This is the ONLY stable surface area theme bundles should import
 * - In the future, builder/storefront will provide a real CommerceAdapter implementation
 */

import React, { createContext, useMemo, useState, useEffect } from 'react';
import type { CommerceAdapter, ThemeCart, ThemeExtensionBlocks, ThemeProduct, ThemeSite } from './types';

export interface ThemeSdkContextValue {
  site: ThemeSite | null;
  products: ThemeProduct[];
  cart: ThemeCart | null;
  settings: Record<string, unknown>;
  commerce: CommerceAdapter;
  extensions: { blocks: ThemeExtensionBlocks };
  refresh(): Promise<void>;
}

const ThemeSdkContext = createContext<ThemeSdkContextValue | null>(null);

class DevCommerceAdapter implements CommerceAdapter {
  async getSite(): Promise<ThemeSite> {
    return { id: 'dev', name: 'Dev Store', domain: null, currency: 'USD' };
  }
  async listProducts(): Promise<ThemeProduct[]> {
    return [
      {
        id: 'p1',
        title: 'Demo Product',
        handle: 'demo-product',
        priceCents: 1299,
        currency: 'USD',
        imageUrl: 'https://picsum.photos/seed/demo/800/600',
      },
    ];
  }
  async getCart(): Promise<ThemeCart> {
    return { lines: [], currency: 'USD' };
  }
  async addToCart(productId: string, quantity: number): Promise<ThemeCart> {
    console.debug('[theme-sdk] DevCommerceAdapter.addToCart', { productId, quantity });
    return { lines: [{ productId, quantity }], currency: 'USD' };
  }
}

export function ThemeSdkProvider({
  children,
  commerce,
  settings,
  extensions,
}: {
  children: React.ReactNode;
  commerce?: CommerceAdapter;
  settings?: Record<string, unknown>;
  extensions?: { blocks?: ThemeExtensionBlocks };
}) {
  const adapter = useMemo(() => commerce ?? new DevCommerceAdapter(), [commerce]);
  const [site, setSite] = useState<ThemeSite | null>(null);
  const [products, setProducts] = useState<ThemeProduct[]>([]);
  const [cart, setCart] = useState<ThemeCart | null>(null);
  const [themeSettings, setThemeSettings] = useState<Record<string, unknown>>(settings || {});
  const [extBlocks, setExtBlocks] = useState<ThemeExtensionBlocks>((extensions?.blocks || {}) as ThemeExtensionBlocks);

  const refresh = async () => {
    try {
      console.debug('[theme-sdk] refresh');
      const [s, p, c] = await Promise.all([adapter.getSite(), adapter.listProducts(), adapter.getCart()]);
      setSite(s);
      setProducts(p);
      setCart(c);
    } catch (e) {
      console.error('[theme-sdk] refresh failed', e);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settings) setThemeSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (extensions?.blocks) setExtBlocks(extensions.blocks);
  }, [extensions]);

  const commerceProxy = useMemo<CommerceAdapter>(
    () => ({
      ...adapter,
      addToCart: async (productId: string, quantity: number) => {
        const next = await adapter.addToCart(productId, quantity);
        setCart(next);
        return next;
      },
    }),
    [adapter],
  );

  const value = useMemo<ThemeSdkContextValue>(
    () => ({
      site,
      products,
      cart,
      settings: themeSettings,
      commerce: commerceProxy,
      extensions: { blocks: extBlocks },
      refresh,
    }),
    [site, products, cart, commerceProxy, adapter, themeSettings, extBlocks],
  );

  return <ThemeSdkContext.Provider value={value}>{children}</ThemeSdkContext.Provider>;
}

export function useThemeSdk() {
  const ctx = React.useContext(ThemeSdkContext);
  if (!ctx) {
    throw new Error('ThemeSdkProvider is missing. Wrap your theme in <ThemeSdkProvider>.');
  }
  return ctx;
}


import styles from './theme-sdk.module.css';

export function ThemeSdk() {
  return (
    <div className={styles['container']}>
      <h1>Welcome to ThemeSdk!</h1>
    </div>
  );
}

export default ThemeSdk;



