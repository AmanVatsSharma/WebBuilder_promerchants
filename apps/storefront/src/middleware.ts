/**
 * File: apps/storefront/src/middleware.ts
 * Module: storefront
 * Purpose: Multi-tenant routing middleware (domain-based)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Adds x-tenant-host for server components to consume
 * - Domain->siteId resolution will move to Domains module later
 */

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || 'unknown';
  const headers = new Headers(request.headers);
  headers.set('x-tenant-host', host);

  // Debug: helpful during initial multi-tenant rollout
  console.debug('[storefront] middleware', { host, path: request.nextUrl.pathname });

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


