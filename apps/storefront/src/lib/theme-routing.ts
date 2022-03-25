/**
 * File: apps/storefront/src/lib/theme-routing.ts
 * Module: storefront
 * Purpose: Map incoming URL paths to theme templates using ThemeManifestV1 routes
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Keep matching intentionally simple (exact and `/:param` segments) for v1
 * - Storefront may fall back to builder page JSON if no route matches
 */

import type React from 'react';
import { assertThemeManifestV1, type ThemeManifestV1 } from '@web-builder/contracts';

export type ThemeTemplateMap = Record<string, React.ComponentType<any>>;

function normalizePathname(pathname: string) {
  if (!pathname) return '/';
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (p !== '/' && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

function routePatternToRegex(pattern: string) {
  const normalized = normalizePathname(pattern);
  const parts = normalized.split('/').filter(Boolean);
  const regexParts = parts.map((part) => {
    if (part.startsWith(':')) return '([^/]+)';
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const re = `^/${regexParts.join('/')}$`;
  return new RegExp(re);
}

export function resolveTemplateMatchForPath(opts: {
  manifest: unknown;
  templates: ThemeTemplateMap | undefined;
  pathname: string;
}): { templateId: string; Template: React.ComponentType<any> } | null {
  const templates = opts.templates || {};
  const manifest = assertThemeManifestV1(opts.manifest) as ThemeManifestV1;
  const pathname = normalizePathname(opts.pathname);

  const routes = manifest.routes || [];
  // First: exact match
  const exact = routes.find((r) => normalizePathname(r.path) === pathname);
  if (exact) {
    const Template = templates[exact.template] || null;
    return Template ? { templateId: exact.template, Template } : null;
  }

  // Second: basic param routes (e.g. "/:slug")
  for (const r of routes) {
    if (!r.path.includes(':')) continue;
    const re = routePatternToRegex(r.path);
    if (re.test(pathname)) {
      const Template = templates[r.template] || null;
      return Template ? { templateId: r.template, Template } : null;
    }
  }

  return null;
}

export function resolveTemplateForPath(opts: {
  manifest: unknown;
  templates: ThemeTemplateMap | undefined;
  pathname: string;
}): React.ComponentType<any> | null {
  const match = resolveTemplateMatchForPath(opts);
  return match?.Template || null;
}
