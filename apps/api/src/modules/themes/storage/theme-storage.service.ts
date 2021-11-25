/**
 * File: apps/api/src/modules/themes/storage/theme-storage.service.ts
 * Module: themes
 * Purpose: Local filesystem storage helper for theme sources (temporary until StorageProvider is extracted)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Stores extracted theme source under: <repo>/storage/themes/<themeVersionId>/src/<path>
 * - Defends against path traversal
 */

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createHash } from 'crypto';

@Injectable()
export class ThemeStorageService {
  private readonly logger = new Logger(ThemeStorageService.name);

  private baseDir() {
    // repo-root/storage
    return process.env.THEME_STORAGE_DIR || path.resolve(process.cwd(), 'storage');
  }

  private themeSrcDir(themeVersionId: string) {
    return path.join(this.baseDir(), 'themes', themeVersionId, 'src');
  }

  private safeJoin(themeVersionId: string, filePath: string) {
    const clean = (filePath || '').replace(/^\/+/, '');
    const resolved = path.resolve(this.themeSrcDir(themeVersionId), clean);
    const root = this.themeSrcDir(themeVersionId);
    if (!resolved.startsWith(root)) {
      throw new Error(`Invalid path (traversal): ${filePath}`);
    }
    return resolved;
  }

  async ensureThemeDir(themeVersionId: string) {
    const dir = this.themeSrcDir(themeVersionId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async writeFile(themeVersionId: string, filePath: string, content: Buffer | string) {
    const abs = this.safeJoin(themeVersionId, filePath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
    const stats = await fs.stat(abs);
    const sha256 = createHash('sha256').update(await fs.readFile(abs)).digest('hex');
    this.logger.debug(`writeFile themeVersionId=${themeVersionId} path=${filePath} size=${stats.size}`);
    return { size: stats.size, sha256 };
  }

  async readFile(themeVersionId: string, filePath: string) {
    const abs = this.safeJoin(themeVersionId, filePath);
    return await fs.readFile(abs, 'utf-8');
  }

  async exists(themeVersionId: string, filePath: string) {
    const abs = this.safeJoin(themeVersionId, filePath);
    try {
      await fs.stat(abs);
      return true;
    } catch {
      return false;
    }
  }

  async listAllFiles(themeVersionId: string): Promise<string[]> {
    const root = this.themeSrcDir(themeVersionId);
    const out: string[] = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else out.push(path.relative(root, full).replaceAll('\\', '/'));
      }
    };
    try {
      await walk(root);
    } catch (e) {
      this.logger.warn(`listAllFiles failed themeVersionId=${themeVersionId} ${(e as Error).message}`);
    }
    return out.sort();
  }
}


