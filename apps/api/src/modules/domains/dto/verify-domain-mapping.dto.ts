/**
 * File: apps/api/src/modules/domains/dto/verify-domain-mapping.dto.ts
 * Module: domains
 * Purpose: DTO for selecting domain verification strategy
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 * Notes:
 * - Optional payload; defaults to AUTO mode
 */

import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { DomainVerificationMethod } from '../verification/domain-verification.types';

export class VerifyDomainMappingDto {
  @IsOptional()
  @IsIn(['AUTO', 'DNS_A', 'DNS_TXT', 'HTTP'])
  method?: DomainVerificationMethod;

  @IsOptional()
  @IsString()
  txtRecordName?: string;

  @IsOptional()
  @IsString()
  txtExpectedValue?: string;

  @IsOptional()
  @IsString()
  httpPath?: string;

  @IsOptional()
  @IsString()
  httpExpectedBodyIncludes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(10000)
  timeoutMs?: number;
}

