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
import { Footer, Header, ThemeSdkProvider } from '@web-builder/theme-sdk';
import HomePage from './pages/home';

export default function ThemeEntry() {
  return (
    <ThemeSdkProvider>
      <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <Header />
        <HomePage />
        <Footer />
      </div>
    </ThemeSdkProvider>
  );
}


