/**
 * @file introspect-token.dto.ts
 * @module identity
 * @description DTO for token introspection endpoint
 * @author BharatERP
 * @created 2026-02-16
 */

import { IsString, MinLength } from 'class-validator';

export class IntrospectTokenDto {
  @IsString()
  @MinLength(20)
  token: string;
}

