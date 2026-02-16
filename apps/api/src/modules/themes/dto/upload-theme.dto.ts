/**
 * File: apps/api/src/modules/themes/dto/upload-theme.dto.ts
 * Module: themes
 * Purpose: DTO for theme upload metadata (bundle file comes via multipart)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadThemeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsIn(['FREE', 'PAID'])
  pricingModel?: 'FREE' | 'PAID';

  @IsOptional()
  @IsString()
  priceCents?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  licenseType?: string;

  @IsOptional()
  @IsString()
  isListed?: string;
}


