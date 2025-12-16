/**
 * File: apps/api/src/modules/themes/dto/update-theme-file.dto.ts
 * Module: themes
 * Purpose: DTO for updating a theme file content
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import { IsString } from 'class-validator';

export class UpdateThemeFileDto {
  @IsString()
  content: string;
}


