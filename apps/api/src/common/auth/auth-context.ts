/**
 * @file auth-context.ts
 * @module common/auth
 * @description JWT-backed auth context parsing for actor/workspace claims
 * @author BharatERP
 * @created 2026-02-16
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface AuthContext {
  actorId: string;
  workspaceIds: string[];
}

type JwtHeader = {
  alg?: string;
  typ?: string;
  kid?: string;
};

type JwtPayload = {
  sub?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  workspaceIds?: unknown;
};

function toBase64UrlBuffer(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(withPadding, 'base64');
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function signHs256(input: string, secret: string) {
  return createHmac('sha256', secret).update(input).digest();
}

function parseJwtParts(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
  return { headerB64, payloadB64, signatureB64 };
}

function readJwtHeader(token: string) {
  const { headerB64 } = parseJwtParts(token);
  return parseJson<JwtHeader>(toBase64UrlBuffer(headerB64).toString('utf8'));
}

function verifyHs256Jwt(token: string, secret: string) {
  const { headerB64, payloadB64, signatureB64 } = parseJwtParts(token);
  const header = parseJson<JwtHeader>(toBase64UrlBuffer(headerB64).toString('utf8'));
  if ((header.alg || '').toUpperCase() !== 'HS256') {
    throw new Error('Unsupported JWT algorithm');
  }

  const expected = signHs256(`${headerB64}.${payloadB64}`, secret);
  const provided = toBase64UrlBuffer(signatureB64);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error('Invalid JWT signature');
  }

  const payload = parseJson<JwtPayload>(toBase64UrlBuffer(payloadB64).toString('utf8'));
  return payload;
}

function verifyHs256JwtWithSecrets(
  token: string,
  keyring: { defaultSecret?: string; secretsByKid?: Record<string, string> },
) {
  const header = readJwtHeader(token);
  const kid = String(header.kid || '').trim();
  const kidSecret = kid ? String(keyring.secretsByKid?.[kid] || '').trim() : '';
  const defaultSecret = String(keyring.defaultSecret || '').trim();
  const secret = kidSecret || defaultSecret;
  if (!secret) throw new Error('Auth secret is required');
  return verifyHs256Jwt(token, secret);
}

function normalizeWorkspaceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function validateAudience(payload: JwtPayload, expectedAudience?: string) {
  if (!expectedAudience) return;
  const aud = payload.aud;
  if (typeof aud === 'string' && aud === expectedAudience) return;
  if (Array.isArray(aud) && aud.includes(expectedAudience)) return;
  throw new Error('JWT audience mismatch');
}

function validateIssuer(payload: JwtPayload, expectedIssuer?: string) {
  if (!expectedIssuer) return;
  if ((payload.iss || '').trim() !== expectedIssuer) {
    throw new Error('JWT issuer mismatch');
  }
}

function validateExpiration(payload: JwtPayload) {
  if (typeof payload.exp !== 'number') return;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) {
    throw new Error('JWT expired');
  }
}

export function parseAuthorizationBearer(headerValue: string | undefined | null) {
  const text = String(headerValue || '').trim();
  if (!text.toLowerCase().startsWith('bearer ')) return '';
  return text.slice(7).trim();
}

export function parseAuthContextFromJwt(token: string, secret: string, options?: { issuer?: string; audience?: string }): AuthContext {
  if (!secret) throw new Error('Auth secret is required');
  const payload = verifyHs256Jwt(token, secret);
  validateExpiration(payload);
  validateIssuer(payload, options?.issuer);
  validateAudience(payload, options?.audience);

  const actorId = String(payload.sub || '').trim();
  if (!actorId) {
    throw new Error('JWT subject missing');
  }

  return {
    actorId,
    workspaceIds: normalizeWorkspaceIds(payload.workspaceIds),
  };
}

export function parseAuthContextFromJwtWithKeyring(
  token: string,
  keyring: { defaultSecret?: string; secretsByKid?: Record<string, string> },
  options?: { issuer?: string; audience?: string },
): AuthContext {
  const payload = verifyHs256JwtWithSecrets(token, keyring);
  validateExpiration(payload);
  validateIssuer(payload, options?.issuer);
  validateAudience(payload, options?.audience);

  const actorId = String(payload.sub || '').trim();
  if (!actorId) {
    throw new Error('JWT subject missing');
  }

  return {
    actorId,
    workspaceIds: normalizeWorkspaceIds(payload.workspaceIds),
  };
}

