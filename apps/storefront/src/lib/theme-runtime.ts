/**
 * File: apps/storefront/src/lib/theme-runtime.ts
 * Module: storefront
 * Purpose: Load compiled theme bundles at runtime (SSR) with caching and safe fallbacks
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Current implementation loads built CJS bundle from local storage/ directory (dev)
 * - Later this will switch to fetching artifacts from storage provider / CDN
 * - Uses a strict require allowlist to reduce risk during early iterations
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { createRequire } from 'module';
import vm from 'node:vm';

type ThemeModule = {
  default?: React.ComponentType<any>;
  manifest?: any;
  templates?: Record<string, React.ComponentType<any>>;
  [key: string]: any;
};

const cache = new Map<string, { mtimeMs: number; mod: ThemeModule }>();

function storageRootDir() {
  return process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage');
}

function themeBundlePath(themeVersionId: string) {
  return path.join(storageRootDir(), 'themes', themeVersionId, 'build', 'theme.cjs');
}

function allowedRequire(spec: string) {
  if (spec === 'react') return true;
  if (spec === 'react/jsx-runtime') return true;
  if (spec === '@web-builder/theme-sdk') return true;
  return false;
}

export async function loadThemeModule(themeVersionId: string): Promise<ThemeModule | null> {
  const bundle = themeBundlePath(themeVersionId);
  try {
    const st = await fs.stat(bundle);
    const cached = cache.get(themeVersionId);
    if (cached && cached.mtimeMs === st.mtimeMs) {
      return cached.mod;
    }

    const code = await fs.readFile(bundle, 'utf-8');
    const moduleObj: { exports: any } = { exports: {} };
    const exportsObj = moduleObj.exports;

    const realRequire = createRequire(process.cwd() + '/');
    const sandboxRequire = (spec: string) => {
      if (!allowedRequire(spec)) {
        throw new Error(`Disallowed require in theme runtime: ${spec}`);
      }
      return realRequire(spec);
    };

    const context = vm.createContext({
      module: moduleObj,
      exports: exportsObj,
      require: sandboxRequire,
      console,
      process: { env: {} }, // do not expose full process
      __dirname: path.dirname(bundle),
      __filename: bundle,
    });

    const wrapped = `(function (exports, require, module, __filename, __dirname) { ${code}\n})`;
    const fn = vm.runInContext(wrapped, context, { filename: bundle, timeout: 1000 });
    fn(moduleObj.exports, sandboxRequire, moduleObj, bundle, path.dirname(bundle));

    const mod = moduleObj.exports as ThemeModule;
    cache.set(themeVersionId, { mtimeMs: st.mtimeMs, mod });
    return mod;
  } catch (e) {
    console.error('[storefront] loadThemeModule failed', { themeVersionId, bundle }, e);
    return null;
  }
}

export async function loadThemeComponent(themeVersionId: string): Promise<React.ComponentType<any> | null> {
  const mod = await loadThemeModule(themeVersionId);
  return mod?.default || null;
}


