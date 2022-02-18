/**
 * File: apps/api/src/shared/storage/storage.types.ts
 * Module: shared/storage
 * Purpose: StorageProvider interface (local fs in dev; S3 compatible in prod)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - All keys must be treated as untrusted input; provider should defend against traversal
 */

export interface StorageWriteResult {
  size: number;
  sha256: string;
}

export interface StorageProvider {
  ensurePrefix(prefix: string): Promise<void>;
  writeBytes(key: string, content: Buffer): Promise<StorageWriteResult>;
  writeText(key: string, content: string): Promise<StorageWriteResult>;
  readBytes(key: string): Promise<Buffer>;
  readText(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
}


