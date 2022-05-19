/**
 * @file upload-extension.dto.ts
 * @module extensions
 * @description DTO for uploading an extension bundle
 * @author BharatERP
 * @created 2026-01-24
 */

import { IsOptional, IsString } from 'class-validator';

export class UploadExtensionDto {
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
}

