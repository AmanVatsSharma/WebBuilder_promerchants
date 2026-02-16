/**
 * File: apps/api/src/modules/domains/tests/domains.service.spec.ts
 * Module: domains
 * Purpose: Unit tests for domain mapping service behaviors
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { DomainsService } from '../domains.service';
import { DomainMapping } from '../entities/domain-mapping.entity';

describe('DomainsService', () => {
  function buildService() {
    const repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const challengeRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const alertRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    const verificationService = {
      verify: jest.fn(),
    };
    const service = new DomainsService(repo as any, challengeRepo as any, alertRepo as any, verificationService as any);
    return { service, repo, challengeRepo, alertRepo, verificationService };
  }

  it('should persist VERIFIED status after successful verification', async () => {
    const { service, repo, verificationService } = buildService();
    const mapping = { id: 'd1', host: 'demo.localhost', siteId: 's1', status: 'PENDING' } as DomainMapping;
    repo.findOne.mockResolvedValue(mapping);
    verificationService.verify.mockResolvedValue({
      host: mapping.host,
      method: 'AUTO',
      verified: true,
      details: { reason: 'localhost-fast-path' },
    });
    repo.save.mockImplementation(async (value) => value);

    const result = await service.verifyMapping(mapping.id);

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'VERIFIED', lastError: null }));
    expect(result.verification.verified).toBe(true);
  });

  it('should persist FAILED status and error after failed verification', async () => {
    const { service, repo, verificationService } = buildService();
    const mapping = { id: 'd2', host: 'shop.example.com', siteId: 's1', status: 'PENDING' } as DomainMapping;
    repo.findOne.mockResolvedValue(mapping);
    verificationService.verify.mockResolvedValue({
      host: mapping.host,
      method: 'DNS_TXT',
      verified: false,
      error: 'Expected TXT value not found',
    });
    repo.save.mockImplementation(async (value) => value);

    const result = await service.verifyMapping(mapping.id, { method: 'DNS_TXT', txtExpectedValue: 'token' });

    expect(verificationService.verify).toHaveBeenCalledWith(
      expect.objectContaining({ host: mapping.host, method: 'DNS_TXT', txtExpectedValue: 'token' }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED', lastError: 'Expected TXT value not found' }),
    );
    expect(result.verification.verified).toBe(false);
  });

  it('should issue DNS_TXT challenge with instructions and reset mapping status', async () => {
    const { service, repo, challengeRepo } = buildService();
    const mapping = { id: 'd3', host: 'shop.example.com', siteId: 's1', status: 'FAILED' } as DomainMapping;
    repo.findOne.mockResolvedValue(mapping);
    repo.save.mockImplementation(async (value) => value);
    challengeRepo.create.mockImplementation((value) => value);
    challengeRepo.save.mockImplementation(async (value) => ({ ...value, id: 'c1' }));

    const result = await service.issueChallenge(mapping.id, { method: 'DNS_TXT' });

    expect(result.instructions.type).toBe('DNS_TXT');
    expect(result.instructions.recordName).toContain(mapping.host);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING', lastError: null }));
  });

  it('should verify challenge and persist proof metadata', async () => {
    const { service, repo, challengeRepo, verificationService } = buildService();
    const challenge = {
      id: 'c2',
      domainMappingId: 'd4',
      method: 'DNS_TXT',
      status: 'ISSUED',
      txtRecordName: '_web-builder.shop.example.com',
      expectedValue: 'token',
    };
    const mapping = { id: 'd4', host: 'shop.example.com', siteId: 's1', status: 'PENDING' } as DomainMapping;
    challengeRepo.findOne.mockResolvedValue(challenge);
    repo.findOne.mockResolvedValue(mapping);
    verificationService.verify.mockResolvedValue({
      host: mapping.host,
      method: 'DNS_TXT',
      verified: true,
      details: { recordName: challenge.txtRecordName },
    });
    challengeRepo.save.mockImplementation(async (value) => value);
    repo.save.mockImplementation(async (value) => value);

    const result = await service.verifyChallenge(challenge.id);

    expect(result.challenge.status).toBe('VERIFIED');
    expect(result.mapping.status).toBe('VERIFIED');
    expect(result.challenge.proof).toEqual({ recordName: challenge.txtRecordName });
  });

  it('should schedule retry window when challenge verification fails', async () => {
    const { service, repo, challengeRepo, verificationService } = buildService();
    const challenge = {
      id: 'c3',
      domainMappingId: 'd5',
      method: 'HTTP',
      status: 'ISSUED',
      attemptCount: 0,
      maxAttempts: 3,
      httpPath: '/.well-known/web-builder-verification.txt',
      expectedValue: 'token',
    };
    const mapping = { id: 'd5', host: 'shop.example.com', siteId: 's1', status: 'PENDING' } as DomainMapping;
    challengeRepo.findOne.mockResolvedValue(challenge);
    repo.findOne.mockResolvedValue(mapping);
    verificationService.verify.mockResolvedValue({
      host: mapping.host,
      method: 'HTTP',
      verified: false,
      error: 'Timeout',
    });
    challengeRepo.save.mockImplementation(async (value) => value);
    repo.save.mockImplementation(async (value) => value);

    const result = await service.verifyChallenge(challenge.id);

    expect(result.challenge.status).toBe('FAILED');
    expect(result.challenge.attemptCount).toBe(1);
    expect(result.challenge.nextAttemptAt).toBeTruthy();
  });

  it('should poll due challenges and process results', async () => {
    const { service, challengeRepo } = buildService();
    const dueChallenges = [{ id: 'c10' }, { id: 'c11' }];
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(dueChallenges),
    };
    challengeRepo.createQueryBuilder.mockReturnValue(qb);
    jest
      .spyOn(service, 'verifyChallenge')
      .mockResolvedValue({ challenge: { id: 'c10', status: 'VERIFIED', attemptCount: 1, maxAttempts: 5 } } as any)
      .mockResolvedValueOnce({ challenge: { id: 'c10', status: 'VERIFIED', attemptCount: 1, maxAttempts: 5 } } as any)
      .mockResolvedValueOnce({ challenge: { id: 'c11', status: 'FAILED', attemptCount: 2, maxAttempts: 5 } } as any);

    const result = await service.pollDueChallenges(20);

    expect(result.scanned).toBe(2);
    expect(result.processed).toHaveLength(2);
  });

  it('should ingest webhook READY event and trigger challenge verification', async () => {
    const { service, repo, challengeRepo } = buildService();
    const challenge = {
      id: 'c20',
      domainMappingId: 'd20',
      status: 'ISSUED',
      provider: null,
      providerReferenceId: null,
      propagationState: 'PENDING',
    };
    const mapping = { id: 'd20', host: 'shop.example.com', siteId: 's20', status: 'PENDING' } as DomainMapping;
    challengeRepo.findOne.mockResolvedValue(challenge);
    repo.findOne.mockResolvedValue(mapping);
    challengeRepo.save.mockImplementation(async (value) => value);
    repo.save.mockImplementation(async (value) => value);
    jest.spyOn(service, 'verifyChallenge').mockResolvedValue({ challenge: { id: 'c20', status: 'VERIFIED' } } as any);

    const result = await service.ingestChallengeWebhook('c20', {
      status: 'READY',
      provider: 'cloudflare',
      providerReferenceId: 'ref-1',
    });

    expect(service.verifyChallenge).toHaveBeenCalledWith('c20', 'scheduler');
    expect(result.challenge.status).toBe('VERIFIED');
  });

  it('should compute challenge slo metrics', async () => {
    const { service, challengeRepo, alertRepo } = buildService();
    challengeRepo.find.mockResolvedValue([
      { status: 'VERIFIED', propagationState: 'READY', attemptCount: 1, maxAttempts: 5 },
      {
        status: 'FAILED',
        propagationState: 'FAILED',
        attemptCount: 5,
        maxAttempts: 5,
        nextAttemptAt: null,
      },
    ]);
    alertRepo.find.mockResolvedValue([
      { delivered: true, createdAt: new Date().toISOString() },
      { delivered: false, createdAt: new Date().toISOString() },
    ]);

    const metrics = await service.getChallengeSloMetrics();

    expect(metrics.totalChallenges).toBe(2);
    expect(metrics.verifiedCount).toBe(1);
    expect(metrics.failedCount).toBe(1);
    expect(metrics.exhaustedCount).toBe(1);
    expect(metrics.alertCount).toBe(2);
    expect(metrics.undeliveredAlerts).toBe(1);
  });
});

