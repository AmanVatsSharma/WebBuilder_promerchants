/**
 * @file theme-manifest-validation.error.ts
 * @module common/errors
 * @description Domain error for invalid ThemeManifestV1 validation failures
 * @author BharatERP
 * @created 2026-01-24
 */

import { AppError } from './app.error';

export class ThemeManifestValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, 'THEME_MANIFEST_INVALID', metadata);
  }
}

