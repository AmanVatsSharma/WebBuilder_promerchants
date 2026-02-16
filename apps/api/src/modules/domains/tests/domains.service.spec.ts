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
    const verificationService = {
      verify: jest.fn(),
    };
    const service = new DomainsService(repo as any, verificationService as any);
    return { service, repo, verificationService };
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
});

