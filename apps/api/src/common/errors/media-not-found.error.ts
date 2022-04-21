/**
 * @file media-not-found.error.ts
 * @module common/errors
 * @description Domain error when media asset cannot be found for a site
 * @author BharatERP
 * @created 2026-01-24
 */

import { AppError } from './app.error';

export class MediaNotFoundError extends AppError {
  constructor(siteId: string, key: string, metadata?: Record<string, any>) {
    super('media not found', 404, 'MEDIA_NOT_FOUND', { siteId, key, ...(metadata || {}) });
  }
}

