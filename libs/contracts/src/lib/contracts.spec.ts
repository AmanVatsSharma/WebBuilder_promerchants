/**
 * File: libs/contracts/src/lib/contracts.spec.ts
 * Module: contracts
 * Purpose: Unit tests for shared contract helpers (manifest validation)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { assertThemeManifestV1, parseThemeManifestV1 } from './theme-manifest';

describe('contracts (manifest validation)', () => {
  it('accepts a valid ThemeManifestV1', () => {
    const manifest = assertThemeManifestV1({
      schemaVersion: 1,
      name: 'Test Theme',
      version: '1.0.0',
      entry: 'entry.tsx',
      routes: [{ path: '/', template: 'pages/home' }],
      sections: [{ type: 'HeroSection', label: 'Hero' }],
    });
    expect(manifest.name).toBe('Test Theme');
  });

  it('rejects invalid ThemeManifestV1 with useful errors', () => {
    const res = parseThemeManifestV1({ schemaVersion: 999 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.join(' ')).toContain('schemaVersion');
      expect(res.errors.join(' ')).toContain('name');
      expect(res.errors.join(' ')).toContain('entry');
    }
  });
});
