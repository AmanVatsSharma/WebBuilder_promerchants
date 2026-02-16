/**
 * File: apps/api/src/modules/domains/domains.controller.ts
 * Module: domains
 * Purpose: Domains endpoints (CRUD + host resolution)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Storefront middleware will call resolve endpoint to map Host->siteId
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { CreateDomainMappingDto } from './dto/create-domain-mapping.dto';
import { VerifyDomainMappingDto } from './dto/verify-domain-mapping.dto';
import { CreateDomainChallengeDto } from './dto/create-domain-challenge.dto';

@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post()
  create(@Body() dto: CreateDomainMappingDto) {
    return this.domainsService.createMapping(dto);
  }

  @Get()
  list() {
    return this.domainsService.listMappings();
  }

  @Get('resolve')
  resolve(@Query('host') host: string) {
    return this.domainsService.resolveHost(host);
  }

  @Post(':id/challenges')
  issueChallenge(@Param('id') id: string, @Body() dto?: CreateDomainChallengeDto) {
    return this.domainsService.issueChallenge(id, dto);
  }

  @Get(':id/challenges')
  listChallenges(@Param('id') id: string) {
    return this.domainsService.listChallenges(id);
  }

  @Post('challenges/:challengeId/verify')
  verifyChallenge(@Param('challengeId') challengeId: string) {
    return this.domainsService.verifyChallenge(challengeId);
  }

  @Post('challenges/poll')
  pollChallenges(@Query('limit') limit?: string) {
    const parsedLimit = Number(limit || 10);
    return this.domainsService.pollDueChallenges(parsedLimit);
  }

  @Post(':id/verify')
  verify(@Param('id') id: string, @Body() dto?: VerifyDomainMappingDto) {
    return this.domainsService.verifyMapping(id, dto);
  }
}


