/**
 * File: apps/api/src/modules/domains/dto/create-domain-mapping.dto.ts
 * Module: domains
 * Purpose: DTO for creating a domain mapping
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - host must be provided without protocol; may include port but will be normalized
 */

import { IsString } from 'class-validator';

export class CreateDomainMappingDto {
  @IsString()
  host: string;

  @IsString()
  siteId: string;
}


