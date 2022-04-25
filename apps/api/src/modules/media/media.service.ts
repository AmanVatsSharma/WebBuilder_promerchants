/**
 * File: apps/api/src/modules/media/media.service.ts
 * Module: media
 * Purpose: Media storage operations using StorageProvider
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - v1 stores media under sites/<siteId>/media/
 */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER } from '../../shared/storage/storage.constants';
import type { StorageProvider } from '../../shared/storage/storage.types';
import { randomUUID } from 'crypto';
import { LoggerService } from '../../shared/logger/logger.service';
import { MediaKeyInvalidError } from '../../common/errors/media-key-invalid.error';
import { MediaNotFoundError } from '../../common/errors/media-not-found.error';

function safeName(name: string) {
  return (name || 'file')
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly logger: LoggerService,
  ) {}

  private mediaPrefix(siteId: string) {
    return `sites/${siteId}/media`;
  }

  private assertSafeKey(key: string) {
    const clean = (key || '').replace(/\\/g, '/');
    if (!clean || clean.startsWith('/') || clean.includes('..') || clean.includes('\0')) {
      throw new MediaKeyInvalidError(key);
    }
    return clean.replace(/^\/+/, '');
  }

  async upload(siteId: string, file: Express.Multer.File) {
    if (!siteId) throw new BadRequestException('siteId is required');
    if (!file?.buffer) throw new BadRequestException('file is required');

    const relKey = `${randomUUID()}-${safeName(file.originalname)}`;
    const key = `${this.mediaPrefix(siteId)}/${relKey}`;
    await this.storage.ensurePrefix(this.mediaPrefix(siteId));
    const { size, sha256 } = await this.storage.writeBytes(key, file.buffer);
    this.logger.info('media upload', { siteId, key, size, sha256 });

    return {
      siteId,
      key: relKey,
      size,
      sha256,
      url: `/api/media/sites/${encodeURIComponent(siteId)}/file?key=${encodeURIComponent(relKey)}`,
    };
  }

  async list(siteId: string) {
    if (!siteId) throw new BadRequestException('siteId is required');
    const prefix = this.mediaPrefix(siteId);
    await this.storage.ensurePrefix(prefix);
    const keys = await this.storage.list(prefix);
    return keys.map((k) => ({
      key: k,
      url: `/api/media/sites/${encodeURIComponent(siteId)}/file?key=${encodeURIComponent(k)}`,
    }));
  }

  async read(siteId: string, key: string) {
    if (!siteId) throw new BadRequestException('siteId is required');
    if (!key) throw new BadRequestException('key is required');
    const safeKey = this.assertSafeKey(key);
    const fullKey = `${this.mediaPrefix(siteId)}/${safeKey}`;
    const exists = await this.storage.exists(fullKey);
    if (!exists) throw new MediaNotFoundError(siteId, safeKey);
    const buf = await this.storage.readBytes(fullKey);
    return { fullKey, buf };
  }
}

