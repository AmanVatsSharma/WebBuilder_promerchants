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

  @Post(':id/verify')
  verify(@Param('id') id: string) {
    return this.domainsService.verifyMapping(id);
  }
}


