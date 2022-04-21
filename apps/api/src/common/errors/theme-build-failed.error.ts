/**
 * @file theme-build-failed.error.ts
 * @module common/errors
 * @description Domain error for theme build failures (esbuild/bundle pipeline)
 * @author BharatERP
 * @created 2026-01-24
 */

import { AppError } from './app.error';

export class ThemeBuildFailedError extends AppError {
  constructor(themeVersionId: string, message: string, metadata?: Record<string, any>) {
    super(message, 422, 'THEME_BUILD_FAILED', { themeVersionId, ...(metadata || {}) });
  }
}

