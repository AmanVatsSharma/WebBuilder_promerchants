/**
 * @file login.dto.ts
 * @module identity
 * @description DTO for identity login and JWT issuance
 * @author BharatERP
 * @created 2026-02-16
 */

import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}

