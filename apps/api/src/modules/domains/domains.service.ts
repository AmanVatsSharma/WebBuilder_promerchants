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
import { VerifyDomainMappingDto } from './dto/verify-domain-mapping.dto';
import { DomainVerificationService } from './verification/domain-verification.service';
import { DomainVerificationChallenge } from './entities/domain-verification-challenge.entity';
import { CreateDomainChallengeDto } from './dto/create-domain-challenge.dto';
import { randomUUID } from 'crypto';

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

function normalizeHttpPath(rawPath?: string) {
  const candidate = String(rawPath || '').trim();
  if (!candidate) return '/.well-known/web-builder-verification.txt';
  return candidate.startsWith('/') ? candidate : `/${candidate}`;
}

function normalizeChallengeMethod(rawMethod?: string) {
  const method = String(rawMethod || '').toUpperCase();
  if (method === 'HTTP') return 'HTTP';
  return 'DNS_TXT';
}

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    @InjectRepository(DomainMapping)
    private readonly repo: Repository<DomainMapping>,
    @InjectRepository(DomainVerificationChallenge)
    private readonly challengeRepo: Repository<DomainVerificationChallenge>,
    private readonly verificationService: DomainVerificationService,
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

  async verifyMapping(id: string, options?: VerifyDomainMappingDto) {
    const mapping = await this.repo.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException(`Domain mapping not found: ${id}`);

    const verification = await this.verificationService.verify({
      host: mapping.host,
      method: options?.method || 'AUTO',
      txtRecordName: options?.txtRecordName,
      txtExpectedValue: options?.txtExpectedValue,
      httpPath: options?.httpPath,
      httpExpectedBodyIncludes: options?.httpExpectedBodyIncludes,
      timeoutMs: options?.timeoutMs,
    });

    if (verification.verified) {
      mapping.status = 'VERIFIED';
      mapping.lastError = null;
      this.logger.log(`verifyMapping success host=${mapping.host} method=${verification.method}`);
    } else {
      mapping.status = 'FAILED';
      mapping.lastError = verification.error || 'Verification failed';
      this.logger.warn(`verifyMapping failed host=${mapping.host} reason=${mapping.lastError}`);
    }

    const saved = await this.repo.save(mapping);
    return {
      ...saved,
      verification,
    };
  }

  async issueChallenge(mappingId: string, dto?: CreateDomainChallengeDto) {
    const mapping = await this.repo.findOne({ where: { id: mappingId } });
    if (!mapping) throw new NotFoundException(`Domain mapping not found: ${mappingId}`);

    const method = normalizeChallengeMethod(dto?.method);
    const token = randomUUID().replace(/-/g, '');
    const expectedValue = String(dto?.expectedValue || token).trim();
    const challenge = this.challengeRepo.create({
      domainMappingId: mapping.id,
      method,
      status: 'ISSUED',
      token,
      expectedValue,
      txtRecordName: method === 'DNS_TXT' ? (dto?.txtRecordName || `_web-builder-challenge.${mapping.host}`) : null,
      httpPath: method === 'HTTP' ? normalizeHttpPath(dto?.httpPath) : null,
      proof: null,
      lastError: null,
      verifiedAt: null,
    });

    mapping.status = 'PENDING';
    mapping.lastError = null;
    await this.repo.save(mapping);
    const saved = await this.challengeRepo.save(challenge);

    return {
      ...saved,
      instructions:
        method === 'DNS_TXT'
          ? {
              type: 'DNS_TXT',
              host: mapping.host,
              recordName: saved.txtRecordName,
              expectedValue: saved.expectedValue,
            }
          : {
              type: 'HTTP',
              host: mapping.host,
              path: saved.httpPath,
              expectedValue: saved.expectedValue,
            },
    };
  }

  async listChallenges(mappingId: string) {
    const mapping = await this.repo.findOne({ where: { id: mappingId } });
    if (!mapping) throw new NotFoundException(`Domain mapping not found: ${mappingId}`);
    return await this.challengeRepo.find({
      where: { domainMappingId: mappingId },
      order: { createdAt: 'DESC' },
    });
  }

  async verifyChallenge(challengeId: string) {
    const challenge = await this.challengeRepo.findOne({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException(`Domain challenge not found: ${challengeId}`);

    const mapping = await this.repo.findOne({ where: { id: challenge.domainMappingId } });
    if (!mapping) throw new NotFoundException(`Domain mapping not found: ${challenge.domainMappingId}`);

    const verification = await this.verificationService.verify({
      host: mapping.host,
      method: challenge.method,
      txtRecordName: challenge.txtRecordName || undefined,
      txtExpectedValue: challenge.method === 'DNS_TXT' ? challenge.expectedValue || undefined : undefined,
      httpPath: challenge.httpPath || undefined,
      httpExpectedBodyIncludes: challenge.method === 'HTTP' ? challenge.expectedValue || undefined : undefined,
    });

    if (verification.verified) {
      challenge.status = 'VERIFIED';
      challenge.lastError = null;
      challenge.verifiedAt = new Date();
      mapping.status = 'VERIFIED';
      mapping.lastError = null;
    } else {
      challenge.status = 'FAILED';
      challenge.lastError = verification.error || 'Challenge verification failed';
      challenge.verifiedAt = null;
      mapping.status = 'FAILED';
      mapping.lastError = challenge.lastError;
    }

    challenge.proof = verification.details || null;
    await this.repo.save(mapping);
    const savedChallenge = await this.challengeRepo.save(challenge);

    return {
      challenge: savedChallenge,
      mapping,
      verification,
    };
  }
}


