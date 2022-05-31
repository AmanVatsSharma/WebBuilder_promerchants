/**
 * File: libs/default-theme/theme/entry.tsx
 * Module: default-theme
 * Purpose: Theme entry point (root layout)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - ThemeBuildService will bundle this file as the entry defined in manifest.json
 * - Keep imports restricted to `react` and `@web-builder/theme-sdk`
 */

import React from 'react';
import { Footer, Header, ThemeSdkProvider, type CommerceAdapter, type ThemeExtensionBlocks } from '@web-builder/theme-sdk';

export default function ThemeEntry({
  children,
  sdk,
}: {
  children?: React.ReactNode;
  sdk?: { commerce?: CommerceAdapter; settings?: Record<string, unknown>; extensions?: { blocks?: ThemeExtensionBlocks } };
}) {
  return (
    <ThemeSdkProvider commerce={sdk?.commerce} settings={sdk?.settings} extensions={sdk?.extensions}>
      <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <Header />
        {children || <div style={{ padding: 24 }}>No template selected for this route.</div>}
        <Footer />
      </div>
    </ThemeSdkProvider>
  );
}


