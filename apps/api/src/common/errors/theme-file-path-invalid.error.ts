/**
 * @file theme-file-path-invalid.error.ts
 * @module common/errors
 * @description Domain error for invalid theme file paths (path traversal / unsafe path)
 * @author BharatERP
 * @created 2026-01-24
 */

import { AppError } from './app.error';

export class ThemeFilePathInvalidError extends AppError {
  constructor(path: string, metadata?: Record<string, any>) {
    super(`Invalid theme file path: ${path}`, 400, 'THEME_FILE_PATH_INVALID', { path, ...(metadata || {}) });
  }
}

