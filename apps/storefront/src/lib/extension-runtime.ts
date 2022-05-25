/**
 * File: apps/storefront/src/lib/extension-runtime.ts
 * Module: storefront
 * Purpose: Load compiled extension bundles at runtime (SSR) with caching and safe fallbacks
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Loads built CJS bundle from local storage/ directory (dev)
 * - Uses a strict require allowlist similar to theme runtime
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { createRequire } from 'module';
import vm from 'node:vm';
import * as ThemeSdk from '@web-builder/theme-sdk';

type ExtensionModule = {
  manifest?: any;
  blocks?: Record<string, React.ComponentType<any>>;
  [key: string]: any;
};

const cache = new Map<string, { mtimeMs: number; mod: ExtensionModule }>();

function storageRootDir() {
  return process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage');
}

function extensionBundlePath(extensionVersionId: string) {
  return path.join(storageRootDir(), 'extensions', extensionVersionId, 'build', 'extension.cjs');
}

function allowedRequire(spec: string) {
  if (spec === 'react') return true;
  if (spec === 'react/jsx-runtime') return true;
  if (spec === '@web-builder/theme-sdk') return true;
  return false;
}

export async function loadExtensionModule(extensionVersionId: string): Promise<ExtensionModule | null> {
  const bundle = extensionBundlePath(extensionVersionId);
  try {
    const st = await fs.stat(bundle);
    const cached = cache.get(extensionVersionId);
    if (cached && cached.mtimeMs === st.mtimeMs) return cached.mod;

    const code = await fs.readFile(bundle, 'utf-8');
    const moduleObj: { exports: any } = { exports: {} };
    const exportsObj = moduleObj.exports;

    const realRequire = createRequire(process.cwd() + '/');
    const sandboxRequire = (spec: string) => {
      if (!allowedRequire(spec)) {
        throw new Error(`Disallowed require in extension runtime: ${spec}`);
      }
      if (spec === '@web-builder/theme-sdk') {
        return ThemeSdk;
      }
      return realRequire(spec);
    };

    const safeConsole =
      process.env.NODE_ENV === 'production'
        ? { log: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined }
        : console;

    const context = vm.createContext({
      module: moduleObj,
      exports: exportsObj,
      require: sandboxRequire,
      console: safeConsole,
      process: { env: {} },
      __dirname: path.dirname(bundle),
      __filename: bundle,
    });

    const wrapped = `(function (exports, require, module, __filename, __dirname) { ${code}\n})`;
    const fn = vm.runInContext(wrapped, context, { filename: bundle, timeout: 1000 });
    fn(moduleObj.exports, sandboxRequire, moduleObj, bundle, path.dirname(bundle));

    const mod = moduleObj.exports as ExtensionModule;
    cache.set(extensionVersionId, { mtimeMs: st.mtimeMs, mod });
    return mod;
  } catch (e) {
    console.error('[storefront] loadExtensionModule failed', { extensionVersionId, bundle }, e);
    return null;
  }
}

