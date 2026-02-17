/**
 * File: apps/api/src/modules/domains/tests/domain-verification.service.spec.ts
 * Module: domains
 * Purpose: Unit tests for domain verification strategy service
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { DomainVerificationService } from '../verification/domain-verification.service';

describe('DomainVerificationService', () => {
  let service: DomainVerificationService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new DomainVerificationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('should verify localhost in AUTO mode', async () => {
    const result = await service.verify({
      host: 'shop.localhost',
      method: 'AUTO',
    });

    expect(result.verified).toBe(true);
    expect(result.method).toBe('AUTO');
  });

  it('should verify DNS A records in DNS_A mode', async () => {
    jest.spyOn(service as any, 'resolveARecords').mockResolvedValue(['127.0.0.1']);
    const result = await service.verify({
      host: 'example.com',
      method: 'DNS_A',
    });

    expect(result.verified).toBe(true);
    expect(result.details).toEqual({ records: ['127.0.0.1'] });
  });

  it('should fail DNS_TXT verification when expected token missing', async () => {
    jest.spyOn(service as any, 'resolveTxtRecords').mockResolvedValue([['abc'], ['def']]);
    const result = await service.verify({
      host: 'example.com',
      method: 'DNS_TXT',
      txtRecordName: '_verify.example.com',
      txtExpectedValue: 'missing-token',
    });

    expect(result.verified).toBe(false);
    expect(result.error).toContain('Expected TXT value not found');
  });

  it('should short-circuit DNS_TXT verification for localhost domains', async () => {
    const result = await service.verify({
      host: 'preview.localhost',
      method: 'DNS_TXT',
      txtExpectedValue: 'token',
    });

    expect(result.verified).toBe(true);
    expect(result.details).toEqual({ reason: 'localhost-fast-path' });
  });

  it('should verify HTTP challenge payload', async () => {
    jest
      .spyOn(service as any, 'fetchUrl')
      .mockResolvedValue(new Response('verification-token', { status: 200 }) as Response);

    const result = await service.verify({
      host: 'example.com',
      method: 'HTTP',
      httpPath: '/.well-known/token.txt',
      httpExpectedBodyIncludes: 'token',
      timeoutMs: 2000,
    });

    expect(result.verified).toBe(true);
    expect(result.details).toEqual({
      url: 'http://example.com/.well-known/token.txt',
      status: 200,
    });
  });
});

