/**
 * File: apps/api/src/modules/domains/verification/domain-verification.service.ts
 * Module: domains
 * Purpose: Strategy-based domain verification execution
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 * Notes:
 * - Supports AUTO/DNS_A/DNS_TXT/HTTP verification modes
 */

import { Injectable, Logger } from '@nestjs/common';
import * as dnsPromises from 'dns/promises';
import { DomainVerificationInput, DomainVerificationMethod, DomainVerificationResult } from './domain-verification.types';

function normalizeHost(host: string) {
  return (host || '').trim().toLowerCase();
}

function normalizePath(pathValue?: string) {
  const candidate = (pathValue || '').trim();
  if (!candidate) return '/.well-known/web-builder-verification.txt';
  return candidate.startsWith('/') ? candidate : `/${candidate}`;
}

function isLocalHost(host: string) {
  return host === 'localhost' || host.endsWith('.localhost');
}

@Injectable()
export class DomainVerificationService {
  private readonly logger = new Logger(DomainVerificationService.name);

  async verify(input: DomainVerificationInput): Promise<DomainVerificationResult> {
    const host = normalizeHost(input.host);
    const method = input.method ?? 'AUTO';

    switch (method) {
      case 'AUTO':
        return await this.verifyAuto(host, input);
      case 'DNS_A':
        return await this.verifyDnsA(host);
      case 'DNS_TXT':
        return await this.verifyDnsTxt(host, input);
      case 'HTTP':
        return await this.verifyHttp(host, input);
      default:
        return {
          host,
          method,
          verified: false,
          error: `Unsupported verification method: ${method}`,
        };
    }
  }

  private async verifyAuto(host: string, input: DomainVerificationInput): Promise<DomainVerificationResult> {
    if (isLocalHost(host)) {
      return {
        host,
        method: 'AUTO',
        verified: true,
        details: { reason: 'localhost-fast-path' },
      };
    }
    return await this.verifyDnsA(host, 'AUTO');
  }

  private async verifyDnsA(host: string, reportedMethod: DomainVerificationMethod = 'DNS_A'): Promise<DomainVerificationResult> {
    try {
      const records = await this.resolveARecords(host);
      if (!records.length) {
        return {
          host,
          method: reportedMethod,
          verified: false,
          error: 'No A records found',
        };
      }
      this.logger.log(`Domain DNS_A verified host=${host} records=${records.join(',')}`);
      return {
        host,
        method: reportedMethod,
        verified: true,
        details: { records },
      };
    } catch (error: any) {
      const message = error?.message || 'DNS A lookup failed';
      this.logger.warn(`Domain DNS_A failed host=${host} reason=${message}`);
      return {
        host,
        method: reportedMethod,
        verified: false,
        error: message,
      };
    }
  }

  private async verifyDnsTxt(host: string, input: DomainVerificationInput): Promise<DomainVerificationResult> {
    if (isLocalHost(host)) {
      return {
        host,
        method: 'DNS_TXT',
        verified: true,
        details: { reason: 'localhost-fast-path' },
      };
    }

    const recordName = (input.txtRecordName || '').trim() || `_web-builder-challenge.${host}`;
    const expectedValue = (input.txtExpectedValue || '').trim();
    try {
      const txtRecords = await this.resolveTxtRecords(recordName);
      const flattened = txtRecords.map((entry) => entry.join('')).filter(Boolean);
      const matchFound = expectedValue ? flattened.some((value) => value.includes(expectedValue)) : flattened.length > 0;
      if (!matchFound) {
        return {
          host,
          method: 'DNS_TXT',
          verified: false,
          error: expectedValue
            ? `Expected TXT value not found in ${recordName}`
            : `No TXT records found for ${recordName}`,
          details: { recordName, records: flattened },
        };
      }
      this.logger.log(`Domain DNS_TXT verified host=${host} record=${recordName}`);
      return {
        host,
        method: 'DNS_TXT',
        verified: true,
        details: { recordName, records: flattened },
      };
    } catch (error: any) {
      const message = error?.message || 'DNS TXT lookup failed';
      this.logger.warn(`Domain DNS_TXT failed host=${host} record=${recordName} reason=${message}`);
      return {
        host,
        method: 'DNS_TXT',
        verified: false,
        error: message,
        details: { recordName },
      };
    }
  }

  private async verifyHttp(host: string, input: DomainVerificationInput): Promise<DomainVerificationResult> {
    if (isLocalHost(host)) {
      return {
        host,
        method: 'HTTP',
        verified: true,
        details: { reason: 'localhost-fast-path' },
      };
    }

    const timeoutMs = Number.isFinite(input.timeoutMs) ? Math.max(1000, Math.min(10000, input.timeoutMs!)) : 4000;
    const pathName = normalizePath(input.httpPath);
    const expectedSnippet = (input.httpExpectedBodyIncludes || '').trim();
    const url = `http://${host}${pathName}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchUrl(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'user-agent': 'web-builder-domain-verifier/1.0' },
      });
      const body = await response.text();
      if (!response.ok) {
        return {
          host,
          method: 'HTTP',
          verified: false,
          error: `HTTP challenge responded ${response.status}`,
          details: { url, status: response.status },
        };
      }
      const matched = expectedSnippet ? body.includes(expectedSnippet) : body.length > 0;
      if (!matched) {
        return {
          host,
          method: 'HTTP',
          verified: false,
          error: expectedSnippet ? 'Expected HTTP challenge body content missing' : 'HTTP challenge body was empty',
          details: { url, bodyLength: body.length },
        };
      }
      this.logger.log(`Domain HTTP verified host=${host} url=${url}`);
      return {
        host,
        method: 'HTTP',
        verified: true,
        details: { url, status: response.status },
      };
    } catch (error: any) {
      const message = error?.message || 'HTTP challenge failed';
      this.logger.warn(`Domain HTTP failed host=${host} url=${url} reason=${message}`);
      return {
        host,
        method: 'HTTP',
        verified: false,
        error: message,
        details: { url },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  protected async resolveARecords(host: string) {
    return await dnsPromises.resolve4(host);
  }

  protected async resolveTxtRecords(recordName: string) {
    return await dnsPromises.resolveTxt(recordName);
  }

  protected async fetchUrl(url: string, init: RequestInit) {
    return await fetch(url, init);
  }
}

