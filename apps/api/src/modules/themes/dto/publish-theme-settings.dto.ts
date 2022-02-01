/**
 * File: apps/api/src/modules/themes/dto/publish-theme-settings.dto.ts
 * Module: themes
 * Purpose: DTO for publishing a site's draft theme settings
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { IsOptional, IsString } from 'class-validator';

export class PublishThemeSettingsDto {
  @IsOptional()
  @IsString()
  themeVersionId?: string;
}

