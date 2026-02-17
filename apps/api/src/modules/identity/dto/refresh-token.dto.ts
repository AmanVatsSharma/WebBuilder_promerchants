/**
 * @file refresh-token.dto.ts
 * @module identity
 * @description DTO for refresh token rotation
 * @author BharatERP
 * @created 2026-02-16
 */

import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  refreshToken: string;
}

