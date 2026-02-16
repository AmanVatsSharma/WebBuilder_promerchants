/**
 * File: apps/api/src/modules/domains/verification/domain-verification.types.ts
 * Module: domains
 * Purpose: Type contracts for domain verification strategies
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 * Notes:
 * - Strategy layer supports current and future challenge providers
 */

export type DomainVerificationMethod = 'AUTO' | 'DNS_A' | 'DNS_TXT' | 'HTTP';

export interface DomainVerificationInput {
  host: string;
  method: DomainVerificationMethod;
  txtRecordName?: string;
  txtExpectedValue?: string;
  httpPath?: string;
  httpExpectedBodyIncludes?: string;
  timeoutMs?: number;
}

export interface DomainVerificationResult {
  host: string;
  method: DomainVerificationMethod;
  verified: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

