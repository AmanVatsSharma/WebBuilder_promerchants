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
import { DomainVerificationService } from './verification/domain-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([DomainMapping])],
  controllers: [DomainsController],
  providers: [DomainsService, DomainVerificationService],
  exports: [DomainsService],
})
export class DomainsModule {}


