/**
 * File: apps/api/src/modules/domains/tests/domain-challenge-scheduler.service.spec.ts
 * Module: domains
 * Purpose: Unit tests for domain challenge scheduler lifecycle behavior
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { DomainChallengeSchedulerService } from '../verification/domain-challenge-scheduler.service';

describe('DomainChallengeSchedulerService', () => {
  const originalEnabled = process.env.DOMAIN_CHALLENGE_SCHEDULER_ENABLED;
  const originalInterval = process.env.DOMAIN_CHALLENGE_SCHEDULER_INTERVAL_MS;

  afterEach(() => {
    process.env.DOMAIN_CHALLENGE_SCHEDULER_ENABLED = originalEnabled;
    process.env.DOMAIN_CHALLENGE_SCHEDULER_INTERVAL_MS = originalInterval;
    jest.useRealTimers();
  });

  it('does not start timer when scheduler is disabled', () => {
    process.env.DOMAIN_CHALLENGE_SCHEDULER_ENABLED = 'false';
    const domainsService = { pollDueChallenges: jest.fn() };
    const scheduler = new DomainChallengeSchedulerService(domainsService as any);

    scheduler.onModuleInit();
    scheduler.onModuleDestroy();
    expect(domainsService.pollDueChallenges).not.toHaveBeenCalled();
  });

  it('polls due challenges when scheduler is enabled', async () => {
    jest.useFakeTimers();
    process.env.DOMAIN_CHALLENGE_SCHEDULER_ENABLED = 'true';
    process.env.DOMAIN_CHALLENGE_SCHEDULER_INTERVAL_MS = '1000';

    const domainsService = {
      pollDueChallenges: jest.fn().mockResolvedValue({ scanned: 0, processed: [] }),
    };
    const scheduler = new DomainChallengeSchedulerService(domainsService as any);
    scheduler.onModuleInit();

    jest.advanceTimersByTime(1100);
    await Promise.resolve();
    expect(domainsService.pollDueChallenges).toHaveBeenCalled();

    scheduler.onModuleDestroy();
  });
});

