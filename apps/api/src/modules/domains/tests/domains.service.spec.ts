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
    };
    const verificationService = {
      verify: jest.fn(),
    };
    const service = new DomainsService(repo as any, challengeRepo as any, verificationService as any);
    return { service, repo, challengeRepo, verificationService };
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
});

