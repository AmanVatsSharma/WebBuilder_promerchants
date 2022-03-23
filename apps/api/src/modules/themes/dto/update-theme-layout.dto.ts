/**
 * File: apps/api/src/modules/themes/dto/update-theme-layout.dto.ts
 * Module: themes
 * Purpose: DTO for updating a site's draft template layout (per theme template)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Layout is stored as JSON (PageNode root) so the storefront can render it deterministically.
 */

import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateThemeLayoutDto {
  @IsOptional()
  @IsString()
  themeVersionId?: string;

  @IsString()
  templateId!: string;

  @IsObject()
  layout!: Record<string, unknown>;
}

