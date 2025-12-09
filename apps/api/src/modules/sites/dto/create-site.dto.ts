/**
 * @file create-site.dto.ts
 * @module sites
 * @description DTO for creating a site
 * @author BharatERP
 * @created 2025-02-09
 */
import { IsString, IsOptional } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  domain?: string;
}

