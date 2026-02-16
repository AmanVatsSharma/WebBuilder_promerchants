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
import { DomainChallengeAlert } from './entities/domain-challenge-alert.entity';
import { CreateDomainChallengeDto } from './dto/create-domain-challenge.dto';
import { randomUUID } from 'crypto';
import { DomainChallengeWebhookDto } from './dto/domain-challenge-webhook.dto';

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

function maxChallengeAttempts() {
  const configured = Number(process.env.DOMAIN_CHALLENGE_MAX_ATTEMPTS || 5);
  return Number.isFinite(configured) ? Math.max(1, Math.min(20, Math.floor(configured))) : 5;
}

function challengeRetryDelayMs() {
  const configured = Number(process.env.DOMAIN_CHALLENGE_RETRY_DELAY_MS || 30000);
  return Number.isFinite(configured) ? Math.max(1000, Math.min(300000, Math.floor(configured))) : 30000;
}

function normalizeProvider(rawProvider?: string) {
  const value = String(rawProvider || '').trim();
  return value || null;
}

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    @InjectRepository(DomainMapping)
    private readonly repo: Repository<DomainMapping>,
    @InjectRepository(DomainVerificationChallenge)
    private readonly challengeRepo: Repository<DomainVerificationChallenge>,
    @InjectRepository(DomainChallengeAlert)
    private readonly alertRepo: Repository<DomainChallengeAlert>,
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
      provider: normalizeProvider(dto?.provider),
      providerReferenceId: dto?.providerReferenceId?.trim() || null,
      propagationState: 'PENDING',
      attemptCount: 0,
      maxAttempts: maxChallengeAttempts(),
      nextAttemptAt: new Date(),
      lastAttemptAt: null,
      lastEventAt: null,
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

  async verifyChallenge(challengeId: string, trigger: 'manual' | 'scheduler' = 'manual') {
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
      challenge.nextAttemptAt = null;
      challenge.propagationState = 'READY';
      mapping.status = 'VERIFIED';
      mapping.lastError = null;
    } else {
      const nextAttempts = Number(challenge.attemptCount || 0) + 1;
      challenge.status = 'FAILED';
      challenge.lastError = verification.error || 'Challenge verification failed';
      challenge.verifiedAt = null;
      challenge.nextAttemptAt = nextAttempts < Number(challenge.maxAttempts || 1)
        ? new Date(Date.now() + challengeRetryDelayMs())
        : null;
      challenge.propagationState = challenge.nextAttemptAt ? 'PROPAGATING' : 'FAILED';
      mapping.status = 'FAILED';
      mapping.lastError = challenge.lastError;
    }

    challenge.attemptCount = Number(challenge.attemptCount || 0) + 1;
    challenge.lastAttemptAt = new Date();
    challenge.lastEventAt = new Date();
    challenge.proof = verification.details || null;
    await this.repo.save(mapping);
    const savedChallenge = await this.challengeRepo.save(challenge);
    this.logger.log(
      `verifyChallenge id=${challengeId} trigger=${trigger} status=${savedChallenge.status} attempt=${savedChallenge.attemptCount}/${savedChallenge.maxAttempts}`,
    );

    return {
      challenge: savedChallenge,
      mapping,
      verification,
    };
  }

  async ingestChallengeWebhook(challengeId: string, dto: DomainChallengeWebhookDto) {
    const challenge = await this.challengeRepo.findOne({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException(`Domain challenge not found: ${challengeId}`);

    const mapping = await this.repo.findOne({ where: { id: challenge.domainMappingId } });
    if (!mapping) throw new NotFoundException(`Domain mapping not found: ${challenge.domainMappingId}`);

    challenge.provider = normalizeProvider(dto.provider) || challenge.provider || null;
    challenge.providerReferenceId = dto.providerReferenceId?.trim() || challenge.providerReferenceId || null;
    challenge.propagationState = dto.status;
    challenge.lastEventAt = new Date();
    if (dto.status === 'FAILED') {
      challenge.status = 'FAILED';
      challenge.lastError = dto.detail || 'Provider webhook reported failure';
      challenge.nextAttemptAt = null;
      mapping.status = 'FAILED';
      mapping.lastError = challenge.lastError;
      await this.emitChallengeAlert({
        challengeId: challenge.id,
        mappingId: mapping.id,
        reason: challenge.lastError,
      });
    }

    await this.challengeRepo.save(challenge);
    await this.repo.save(mapping);

    if (dto.status === 'READY') {
      return await this.verifyChallenge(challenge.id, 'scheduler');
    }

    return {
      challenge,
      mapping,
      webhook: {
        status: dto.status,
        detail: dto.detail || null,
      },
    };
  }

  async pollDueChallenges(limit = 10) {
    const effectiveLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const now = new Date();
    const challenges = await this.challengeRepo
      .createQueryBuilder('challenge')
      .where('(challenge.status = :issued OR challenge.status = :failed)', {
        issued: 'ISSUED',
        failed: 'FAILED',
      })
      .andWhere('(challenge.nextAttemptAt IS NULL OR challenge.nextAttemptAt <= :now)', { now: now.toISOString() })
      .andWhere('challenge.attemptCount < challenge.maxAttempts')
      .orderBy('challenge.updatedAt', 'ASC')
      .limit(effectiveLimit)
      .getMany();

    const processed: Array<{
      challengeId: string;
      status: string;
      attemptCount: number;
      maxAttempts: number;
    }> = [];

    for (const challenge of challenges) {
      try {
        const result = await this.verifyChallenge(challenge.id, 'scheduler');
        processed.push({
          challengeId: result.challenge.id,
          status: result.challenge.status,
          attemptCount: result.challenge.attemptCount,
          maxAttempts: result.challenge.maxAttempts,
        });
        if (
          result.challenge.status === 'FAILED' &&
          result.challenge.attemptCount >= result.challenge.maxAttempts
        ) {
          await this.emitChallengeAlert({
            challengeId: result.challenge.id,
            reason: result.challenge.lastError || 'Domain challenge exhausted retries',
            mappingId: result.mapping?.id || '',
          });
        }
      } catch (error: any) {
        this.logger.warn(`pollDueChallenges failed challengeId=${challenge.id} reason=${error?.message || error}`);
      }
    }

    return {
      polledAt: now.toISOString(),
      scanned: challenges.length,
      processed,
    };
  }

  async listChallengeAlerts(limit = 50, delivered?: boolean) {
    const effectiveLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    return await this.alertRepo.find({
      where: typeof delivered === 'boolean' ? { delivered } : {},
      order: { createdAt: 'DESC' },
      take: effectiveLimit,
    });
  }

  async getChallengeSloMetrics() {
    const [challenges, alerts] = await Promise.all([
      this.challengeRepo.find(),
      this.alertRepo.find(),
    ]);

    const totalChallenges = challenges.length;
    const verifiedCount = challenges.filter((item) => item.status === 'VERIFIED').length;
    const failedCount = challenges.filter((item) => item.status === 'FAILED').length;
    const issuedCount = challenges.filter((item) => item.status === 'ISSUED').length;
    const readyPropagationCount = challenges.filter((item) => item.propagationState === 'READY').length;
    const pendingPropagationCount = challenges.filter((item) => item.propagationState === 'PENDING').length;
    const propagatingCount = challenges.filter((item) => item.propagationState === 'PROPAGATING').length;
    const failedPropagationCount = challenges.filter((item) => item.propagationState === 'FAILED').length;
    const dueRetryCount = challenges.filter((item) => item.nextAttemptAt && new Date(item.nextAttemptAt).getTime() <= Date.now()).length;
    const exhaustedCount = challenges.filter(
      (item) => item.status !== 'VERIFIED' && Number(item.attemptCount || 0) >= Number(item.maxAttempts || 0),
    ).length;
    const averageAttempts =
      totalChallenges > 0
        ? Number(
            (
              challenges.reduce((sum, item) => sum + Number(item.attemptCount || 0), 0) /
              Math.max(1, totalChallenges)
            ).toFixed(2),
          )
        : 0;
    const completed = verifiedCount + failedCount;
    const verificationSuccessRate = completed > 0 ? Number((verifiedCount / completed).toFixed(4)) : 0;
    const undeliveredAlerts = alerts.filter((item) => !item.delivered).length;
    const alertCount = alerts.length;
    const alertsLast24h = alerts.filter(
      (item) => new Date(item.createdAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000,
    ).length;

    return {
      generatedAt: new Date().toISOString(),
      totalChallenges,
      issuedCount,
      verifiedCount,
      failedCount,
      pendingPropagationCount,
      propagatingCount,
      readyPropagationCount,
      failedPropagationCount,
      dueRetryCount,
      exhaustedCount,
      averageAttempts,
      verificationSuccessRate,
      alertCount,
      alertsLast24h,
      undeliveredAlerts,
    };
  }

  async getChallengeSloMetricsPrometheus() {
    const metrics = await this.getChallengeSloMetrics();
    return [
      '# HELP domain_challenges_total Total persisted domain verification challenges',
      '# TYPE domain_challenges_total gauge',
      `domain_challenges_total ${metrics.totalChallenges}`,
      '# HELP domain_challenges_verified_total Total verified domain challenges',
      '# TYPE domain_challenges_verified_total gauge',
      `domain_challenges_verified_total ${metrics.verifiedCount}`,
      '# HELP domain_challenges_failed_total Total failed domain challenges',
      '# TYPE domain_challenges_failed_total gauge',
      `domain_challenges_failed_total ${metrics.failedCount}`,
      '# HELP domain_challenges_retry_due_total Total due retries',
      '# TYPE domain_challenges_retry_due_total gauge',
      `domain_challenges_retry_due_total ${metrics.dueRetryCount}`,
      '# HELP domain_challenges_exhausted_total Total exhausted challenges',
      '# TYPE domain_challenges_exhausted_total gauge',
      `domain_challenges_exhausted_total ${metrics.exhaustedCount}`,
      '# HELP domain_challenges_success_rate Verification success rate among completed challenges',
      '# TYPE domain_challenges_success_rate gauge',
      `domain_challenges_success_rate ${metrics.verificationSuccessRate}`,
      '# HELP domain_challenge_alerts_total Total persisted domain challenge alerts',
      '# TYPE domain_challenge_alerts_total gauge',
      `domain_challenge_alerts_total ${metrics.alertCount}`,
      '# HELP domain_challenge_alerts_undelivered_total Undelivered domain challenge alerts',
      '# TYPE domain_challenge_alerts_undelivered_total gauge',
      `domain_challenge_alerts_undelivered_total ${metrics.undeliveredAlerts}`,
      '',
    ].join('\n');
  }

  private async emitChallengeAlert(payload: { challengeId: string; mappingId: string; reason: string }) {
    const url = String(process.env.DOMAIN_CHALLENGE_ALERT_WEBHOOK_URL || '').trim();
    const alert = await this.alertRepo.save(
      this.alertRepo.create({
        challengeId: payload.challengeId,
        mappingId: payload.mappingId,
        severity: 'ERROR',
        eventType: 'domain.challenge.failed',
        message: payload.reason,
        payload: {
          challengeId: payload.challengeId,
          mappingId: payload.mappingId,
          reason: payload.reason,
        },
        delivered: false,
        deliveryStatusCode: null,
        deliveryError: null,
      }),
    );
    if (!url) return;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'domain.challenge.failed',
          challengeId: payload.challengeId,
          mappingId: payload.mappingId,
          reason: payload.reason,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        alert.delivered = false;
        alert.deliveryStatusCode = response.status;
        alert.deliveryError = `Non-2xx status ${response.status}`;
        await this.alertRepo.save(alert);
        this.logger.warn(`emitChallengeAlert non-2xx status=${response.status}`);
      } else {
        alert.delivered = true;
        alert.deliveryStatusCode = response.status;
        alert.deliveryError = null;
        await this.alertRepo.save(alert);
      }
    } catch (error: any) {
      alert.delivered = false;
      alert.deliveryError = error?.message || String(error);
      await this.alertRepo.save(alert);
      this.logger.warn(`emitChallengeAlert failed reason=${error?.message || error}`);
    }
  }
}


