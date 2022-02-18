/**
 * File: apps/api/src/shared/storage/local-fs.storage.ts
 * Module: shared/storage
 * Purpose: Local filesystem storage provider implementation
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Root defaults to <repo>/storage
 * - Intended for dev; prod will use an S3 compatible provider later
 */

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import type { StorageProvider, StorageWriteResult } from './storage.types';

@Injectable()
export class LocalFsStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalFsStorageProvider.name);

  private rootDir() {
    return process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage');
  }

  private safeResolve(key: string) {
    const clean = (key || '').replace(/^\/+/, '');
    const resolved = path.resolve(this.rootDir(), clean);
    const root = this.rootDir();
    if (!resolved.startsWith(root)) {
      throw new Error(`Invalid storage key (traversal): ${key}`);
    }
    return resolved;
  }

  async ensurePrefix(prefix: string) {
    const abs = this.safeResolve(prefix);
    await fs.mkdir(abs, { recursive: true });
  }

  async writeBytes(key: string, content: Buffer): Promise<StorageWriteResult> {
    const abs = this.safeResolve(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
    const stats = await fs.stat(abs);
    const sha256 = createHash('sha256').update(await fs.readFile(abs)).digest('hex');
    this.logger.debug(`writeBytes key=${key} size=${stats.size}`);
    return { size: stats.size, sha256 };
  }

  async writeText(key: string, content: string): Promise<StorageWriteResult> {
    return await this.writeBytes(key, Buffer.from(content, 'utf-8'));
  }

  async readBytes(key: string): Promise<Buffer> {
    const abs = this.safeResolve(key);
    return await fs.readFile(abs);
  }

  async readText(key: string): Promise<string> {
    const abs = this.safeResolve(key);
    return await fs.readFile(abs, 'utf-8');
  }

  async exists(key: string): Promise<boolean> {
    try {
      const abs = this.safeResolve(key);
      await fs.stat(abs);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const rootAbs = this.safeResolve(prefix);
    const out: string[] = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else out.push(path.relative(rootAbs, full).replace(/\\/g, '/'));
      }
    };
    try {
      await walk(rootAbs);
    } catch (e) {
      this.logger.warn(`list failed prefix=${prefix} ${(e as Error).message}`);
    }
    return out.sort();
  }
}


