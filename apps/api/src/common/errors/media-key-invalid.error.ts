/**
 * @file media-key-invalid.error.ts
 * @module common/errors
 * @description Domain error for invalid media keys (path traversal / unsafe key)
 * @author BharatERP
 * @created 2026-01-24
 */

import { AppError } from './app.error';

export class MediaKeyInvalidError extends AppError {
  constructor(key: string, metadata?: Record<string, any>) {
    super(`Invalid media key: ${key}`, 400, 'MEDIA_KEY_INVALID', { key, ...(metadata || {}) });
  }
}

