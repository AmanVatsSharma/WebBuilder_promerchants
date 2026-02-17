/**
 * File: apps/api/src/modules/domains/dto/domain-challenge-webhook.dto.ts
 * Module: domains
 * Purpose: DTO for provider webhook events on domain challenge propagation state
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { IsIn, IsOptional, IsString } from 'class-validator';

export class DomainChallengeWebhookDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReferenceId?: string;

  @IsIn(['PENDING', 'PROPAGATING', 'READY', 'FAILED'])
  status: 'PENDING' | 'PROPAGATING' | 'READY' | 'FAILED';

  @IsOptional()
  @IsString()
  detail?: string;
}

