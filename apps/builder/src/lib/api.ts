/**
 * File: apps/builder/src/lib/api.ts
 * Module: builder
 * Purpose: Small API helper with consistent logging and error handling
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Uses relative `/api/*` which is rewritten to Nest API by next.config.js
 */

function getOrCreateRequestId(): string {
  try {
    const key = 'webbuilder.requestId';
    const existing = window.sessionStorage.getItem(key);
    if (existing && existing.trim()) return existing;
    const next = crypto.randomUUID();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    // Fallback: still provide *some* correlation id.
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function requestHeaders(extra?: HeadersInit): HeadersInit {
  const requestId = typeof window !== 'undefined' ? getOrCreateRequestId() : undefined;
  return {
    ...(requestId ? { 'x-request-id': requestId } : {}),
    ...(extra || {}),
  };
}

async function readErrorText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  console.debug('[builder-api] GET', path);
  const res = await fetch(path, { cache: 'no-store', headers: requestHeaders() });
  if (!res.ok) {
    const text = await readErrorText(res);
    console.error('[builder-api] GET failed', { path, status: res.status, text });
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  console.debug('[builder-api] POST', path, body);
  const res = await fetch(path, {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await readErrorText(res);
    console.error('[builder-api] POST failed', { path, status: res.status, text });
    throw new Error(`POST ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  console.debug('[builder-api] PUT', path, body);
  const res = await fetch(path, {
    method: 'PUT',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await readErrorText(res);
    console.error('[builder-api] PUT failed', { path, status: res.status, text });
    throw new Error(`PUT ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  console.debug('[builder-api] UPLOAD', path);
  const res = await fetch(path, { method: 'POST', body: form, headers: requestHeaders() });
  if (!res.ok) {
    const text = await readErrorText(res);
    console.error('[builder-api] UPLOAD failed', { path, status: res.status, text });
    throw new Error(`UPLOAD ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}


