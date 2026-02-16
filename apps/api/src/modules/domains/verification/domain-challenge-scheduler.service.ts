/**
 * File: apps/api/src/modules/domains/verification/domain-challenge-scheduler.service.ts
 * Module: domains
 * Purpose: Background scheduler for retrying due domain verification challenges
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DomainsService } from '../domains.service';

function schedulerEnabled() {
  return String(process.env.DOMAIN_CHALLENGE_SCHEDULER_ENABLED || '').toLowerCase() === 'true';
}

function pollIntervalMs() {
  const configured = Number(process.env.DOMAIN_CHALLENGE_SCHEDULER_INTERVAL_MS || 30000);
  return Number.isFinite(configured) ? Math.max(1000, Math.min(300000, Math.floor(configured))) : 30000;
}

@Injectable()
export class DomainChallengeSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DomainChallengeSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly domainsService: DomainsService) {}

  onModuleInit() {
    if (!schedulerEnabled()) {
      this.logger.log('Domain challenge scheduler disabled');
      return;
    }
    const intervalMs = pollIntervalMs();
    this.logger.log(`Domain challenge scheduler enabled intervalMs=${intervalMs}`);
    this.timer = setInterval(() => {
      void this.runPollCycle();
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async runPollCycle() {
    try {
      const result = await this.domainsService.pollDueChallenges(25);
      if (result.scanned > 0) {
        this.logger.log(`Domain challenge scheduler processed scanned=${result.scanned}`);
      }
    } catch (error: any) {
      this.logger.warn(`Domain challenge scheduler failed reason=${error?.message || error}`);
    }
  }
}

