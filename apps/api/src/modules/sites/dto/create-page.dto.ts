/**
 * @file create-page.dto.ts
 * @module sites
 * @description DTO for creating a page
 * @author BharatERP
 * @created 2025-02-09
 */
import { IsString, IsOptional } from 'class-validator';

export class CreatePageDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsOptional()
  content?: Record<string, any>;
}

