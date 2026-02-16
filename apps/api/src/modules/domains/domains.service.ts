/**
 * File: apps/api/src/modules/domains/domains.service.ts
 * Module: domains
 * Purpose: Domains service for host->siteId resolution and mapping management
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - This is intentionally simple now; verification will be expanded later
 * - Keep logging verbose for debugging multi-tenant issues
 */

import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainMapping } from './entities/domain-mapping.entity';
import { CreateDomainMappingDto } from './dto/create-domain-mapping.dto';
import { resolve4 } from 'dns/promises';

function normalizeHost(host: string) {
  const trimmed = (host || '').trim();
  if (!trimmed) return '';
  // Remove protocol if present (defensive)
  const noProto = trimmed.replace(/^https?:\/\//i, '');
  // Remove path/query if present (defensive)
  const onlyHost = noProto.split('/')[0].split('?')[0].split('#')[0];
  // Remove port
  return onlyHost.split(':')[0].toLowerCase();
}

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    @InjectRepository(DomainMapping)
    private readonly repo: Repository<DomainMapping>,
  ) {}

  async createMapping(dto: CreateDomainMappingDto) {
    const host = normalizeHost(dto.host);
    if (!host) throw new BadRequestException('host is required');
    if (!dto.siteId) throw new BadRequestException('siteId is required');

    this.logger.log(`Creating domain mapping host=${host} siteId=${dto.siteId}`);
    const mapping = this.repo.create({ host, siteId: dto.siteId, status: 'PENDING' });
    return await this.repo.save(mapping);
  }

  async listMappings() {
    return await this.repo.find();
  }

  async resolveHost(host: string) {
    const normalized = normalizeHost(host);
    if (!normalized) throw new BadRequestException('host is required');

    const mapping = await this.repo.findOne({ where: { host: normalized } });
    if (!mapping) throw new NotFoundException(`No mapping found for host=${normalized}`);

    // For now: allow resolution even if PENDING, but return status for UI/middleware decisions
    return {
      host: mapping.host,
      siteId: mapping.siteId,
      status: mapping.status,
    };
  }

  async verifyMapping(id: string) {
    const mapping = await this.repo.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException(`Domain mapping not found: ${id}`);

    // Local dev convenience: localhost hosts are treated as verified.
    if (mapping.host === 'localhost' || mapping.host.endsWith('.localhost')) {
      mapping.status = 'VERIFIED';
      mapping.lastError = null;
      return await this.repo.save(mapping);
    }

    try {
      const records = await resolve4(mapping.host);
      if (!records.length) {
        throw new Error('No A records found');
      }
      mapping.status = 'VERIFIED';
      mapping.lastError = null;
      this.logger.log(`verifyMapping success host=${mapping.host} records=${records.join(',')}`);
    } catch (e: any) {
      mapping.status = 'FAILED';
      mapping.lastError = e?.message || 'Verification failed';
      this.logger.warn(`verifyMapping failed host=${mapping.host} reason=${mapping.lastError}`);
    }

    return await this.repo.save(mapping);
  }
}


