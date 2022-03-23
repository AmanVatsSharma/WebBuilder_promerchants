/**
 * File: apps/api/src/modules/themes/dto/publish-theme-layout.dto.ts
 * Module: themes
 * Purpose: DTO for publishing a site's draft template layout
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { IsOptional, IsString } from 'class-validator';

export class PublishThemeLayoutDto {
  @IsOptional()
  @IsString()
  themeVersionId?: string;

  @IsString()
  templateId!: string;
}

