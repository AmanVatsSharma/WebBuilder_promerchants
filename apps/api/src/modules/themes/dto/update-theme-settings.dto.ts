/**
 * File: apps/api/src/modules/themes/dto/update-theme-settings.dto.ts
 * Module: themes
 * Purpose: DTO for updating a site's draft theme settings
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Settings are stored as JSON; validation is shallow in v1 (deeper schema validation is added later)
 */

import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateThemeSettingsDto {
  @IsOptional()
  @IsString()
  themeVersionId?: string;

  @IsObject()
  settings!: Record<string, unknown>;
}

