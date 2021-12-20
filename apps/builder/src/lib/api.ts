/**
 * File: apps/builder/src/lib/api.ts
 * Module: builder
 * Purpose: Small API helper with consistent logging and error handling
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Uses relative `/api/*` which is rewritten to Nest API by next.config.js
 */

export async function apiGet<T>(path: string): Promise<T> {
  console.debug('[builder-api] GET', path);
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[builder-api] GET failed', { path, status: res.status, text });
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  console.debug('[builder-api] POST', path, body);
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[builder-api] POST failed', { path, status: res.status, text });
    throw new Error(`POST ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  console.debug('[builder-api] PUT', path, body);
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[builder-api] PUT failed', { path, status: res.status, text });
    throw new Error(`PUT ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}


