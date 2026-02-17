/**
 * File: apps/api/src/modules/domains/domains.module.ts
 * Module: domains
 * Purpose: Domains module wiring
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Exposes DomainsService for other modules (themes/storefront support)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { DomainMapping } from './entities/domain-mapping.entity';
import { DomainVerificationChallenge } from './entities/domain-verification-challenge.entity';
import { DomainChallengeAlert } from './entities/domain-challenge-alert.entity';
import { DomainVerificationService } from './verification/domain-verification.service';
import { DomainChallengeSchedulerService } from './verification/domain-challenge-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([DomainMapping, DomainVerificationChallenge, DomainChallengeAlert])],
  controllers: [DomainsController],
  providers: [DomainsService, DomainVerificationService, DomainChallengeSchedulerService],
  exports: [DomainsService],
})
export class DomainsModule {}


