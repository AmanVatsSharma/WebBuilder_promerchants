/**
 * @file install-extension.dto.ts
 * @module extensions
 * @description DTO for installing an extension version into a site
 * @author BharatERP
 * @created 2026-01-24
 */

import { IsString } from 'class-validator';

export class InstallExtensionDto {
  @IsString()
  extensionId: string;

  @IsString()
  extensionVersionId: string;
}

