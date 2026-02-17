/**
 * File: libs/contracts/src/lib/contracts.spec.ts
 * Module: contracts
 * Purpose: Unit tests for shared contract helpers (manifest validation)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { assertThemeManifestV1, parseThemeManifestV1 } from './theme-manifest';
import { parseExtensionManifestV1 } from './extension-manifest';

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

  it('rejects unsafe ThemeManifestV1 bundle paths', () => {
    const res = parseThemeManifestV1({
      schemaVersion: 1,
      name: 'Unsafe Theme',
      version: '1.0.0',
      entry: '../entry.tsx',
      routes: [{ path: '/', template: '../pages/home' }],
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      const joined = res.errors.join(' ');
      expect(joined).toContain('entry');
      expect(joined).toContain('template');
      expect(joined).toContain('safe bundle-relative path');
    }
  });

  it('rejects unsafe ExtensionManifestV1 block entry paths', () => {
    const res = parseExtensionManifestV1({
      schemaVersion: 1,
      name: 'Unsafe Extension',
      version: '1.0.0',
      blocks: [{ type: 'ext.bad', label: 'Bad', entry: '/abs/path.tsx' }],
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.join(' ')).toContain('safe bundle-relative path');
    }
  });
});
