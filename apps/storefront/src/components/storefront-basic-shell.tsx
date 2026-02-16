/**
 * File: apps/storefront/src/components/storefront-basic-shell.tsx
 * Module: storefront
 * Purpose: Branded shell wrapper for non-theme rendered storefront pages
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import React from 'react';

export function StorefrontBasicShell({
  siteName,
  host,
  children,
}: {
  siteName: string;
  host: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-slate-300">Storefront</div>
            <div className="text-lg font-semibold">{siteName}</div>
          </div>
          <div className="rounded border border-white/30 bg-white/10 px-3 py-1 text-xs text-slate-200">
            host: <span className="font-mono">{host}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-slate-500">
          Powered by WebBuilder storefront runtime.
        </div>
      </footer>
    </div>
  );
}

