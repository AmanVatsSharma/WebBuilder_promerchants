/**
 * File: apps/api/src/shared/queue/redis.config.ts
 * Module: shared/queue
 * Purpose: Build Redis connection options from environment variables
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Supports REDIS_URL or REDIS_HOST/REDIS_PORT.
 * - Keeps defaults developer-friendly (localhost), but production should set REDIS_URL.
 */

import type { ConnectionOptions } from 'bullmq';

function parseIntSafe(v: string | undefined, fallback: number) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export function buildRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (url) {
    const u = new URL(url);
    const port = u.port ? parseIntSafe(u.port, 6379) : 6379;
    const username = u.username ? decodeURIComponent(u.username) : undefined;
    const password = u.password ? decodeURIComponent(u.password) : undefined;
    const db = u.pathname?.startsWith('/') ? parseIntSafe(u.pathname.slice(1), 0) : 0;
    const tls = u.protocol === 'rediss:' ? {} : undefined;

    return {
      host: u.hostname,
      port,
      username,
      password,
      db,
      tls,
    };
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseIntSafe(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseIntSafe(process.env.REDIS_DB, 0),
  };
}

