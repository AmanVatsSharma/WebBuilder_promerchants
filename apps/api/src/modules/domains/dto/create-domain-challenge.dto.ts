/**
 * File: apps/api/src/modules/domains/dto/create-domain-challenge.dto.ts
 * Module: domains
 * Purpose: DTO for issuing async domain verification challenges
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDomainChallengeDto {
  @IsOptional()
  @IsIn(['DNS_TXT', 'HTTP'])
  method?: 'DNS_TXT' | 'HTTP';

  @IsOptional()
  @IsString()
  txtRecordName?: string;

  @IsOptional()
  @IsString()
  httpPath?: string;

  @IsOptional()
  @IsString()
  expectedValue?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReferenceId?: string;
}

