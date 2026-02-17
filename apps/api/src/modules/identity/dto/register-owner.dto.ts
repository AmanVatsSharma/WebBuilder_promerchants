/**
 * @file register-owner.dto.ts
 * @module identity
 * @description DTO for creating owner user and initial workspace
 * @author BharatERP
 * @created 2026-02-16
 */

import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterOwnerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  workspaceName: string;
}

