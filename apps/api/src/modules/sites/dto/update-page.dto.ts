/**
 * @file update-page.dto.ts
 * @module sites
 * @description DTO for updating a page
 * @author BharatERP
 * @created 2025-02-09
 */
import { IsString, IsOptional } from 'class-validator';

export class UpdatePageDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsOptional()
  content?: Record<string, any>;
}

