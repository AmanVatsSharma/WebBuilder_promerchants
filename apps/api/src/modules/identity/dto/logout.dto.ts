/**
 * @file logout.dto.ts
 * @module identity
 * @description DTO for refresh token revocation/logout
 * @author BharatERP
 * @created 2026-02-16
 */

import { IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @IsString()
  @MinLength(20)
  refreshToken: string;
}

