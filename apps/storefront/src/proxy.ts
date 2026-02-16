/**
 * File: apps/storefront/src/proxy.ts
 * Module: storefront
 * Purpose: Multi-tenant routing proxy (domain-based request header enrichment)
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 * Notes:
 * - Adds x-tenant-host for server components to consume
 * - Domain->siteId resolution is completed inside API/domain modules
 */

import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || 'unknown';
  const headers = new Headers(request.headers);
  headers.set('x-tenant-host', host);

  console.debug('[storefront] proxy', { host, path: request.nextUrl.pathname });

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

