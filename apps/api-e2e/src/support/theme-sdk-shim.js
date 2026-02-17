/**
 * File: apps/api-e2e/src/support/theme-sdk-shim.js
 * Module: api-e2e
 * Purpose: CommonJS shim for @web-builder/theme-sdk so api-e2e can require compiled theme bundles without ESM/TSX runtime issues.
 * Author: BharatERP
 * Last-updated: 2026-01-24
 *
 * Notes:
 * - This is only for tests. Storefront runtime uses the real theme-sdk.
 * - We implement the minimal surface used by default-theme templates so `renderToString()` can execute.
 */

const React = require('react');

const ThemeSdkContext = React.createContext({
  site: { id: 'test', name: 'TestSite' },
  settings: {},
  products: [],
  cart: { id: 'cart', lines: [] },
  commerce: {
    addToCart: async () => ({ id: 'cart', lines: [] }),
    getCart: async () => ({ id: 'cart', lines: [] }),
    listProducts: async () => [],
  },
});

function ThemeSdkProvider({ children, settings, commerce }) {
  const value = React.useMemo(
    () => ({
      site: { id: 'test', name: 'TestSite' },
      settings: settings || {},
      products: [],
      cart: { id: 'cart', lines: [] },
      commerce:
        commerce ||
        ({
          addToCart: async () => ({ id: 'cart', lines: [] }),
          getCart: async () => ({ id: 'cart', lines: [] }),
          listProducts: async () => [],
        }),
    }),
    [settings, commerce],
  );
  return React.createElement(ThemeSdkContext.Provider, { value }, children);
}

function useThemeSdk() {
  return React.useContext(ThemeSdkContext);
}

function useProducts() {
  return useThemeSdk().products;
}

function Header() {
  return React.createElement('div', null);
}

function Footer() {
  return React.createElement('div', null);
}

function Money({ cents, currency }) {
  const value = (Number(cents) || 0) / 100;
  return React.createElement('span', null, `${currency || 'USD'} ${value.toFixed(2)}`);
}

function ProductCard() {
  return React.createElement('div', null);
}

function ThemeNodeRenderer({ node }) {
  return React.createElement('pre', null, JSON.stringify(node || {}));
}

module.exports = {
  ThemeSdkProvider,
  useThemeSdk,
  useProducts,
  Header,
  Footer,
  Money,
  ProductCard,
  ThemeNodeRenderer,
};

