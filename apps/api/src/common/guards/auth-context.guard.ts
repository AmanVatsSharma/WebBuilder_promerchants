/**
 * @file auth-context.guard.ts
 * @module common/guards
 * @description Optional JWT auth context guard for actor/workspace claims
 * @author BharatERP
 * @created 2026-02-16
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { parseAuthContextFromJwtWithKeyring, parseAuthorizationBearer } from '../auth/auth-context';

function authContextEnforced() {
  return String(process.env.ENFORCE_AUTH_CONTEXT || '').toLowerCase() === 'true';
}

function isPublicAuthRoute(path: string) {
  return (
    path === '/api' ||
    path === '/api/health' ||
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/refresh') ||
    path.startsWith('/api/auth/logout') ||
    path.startsWith('/api/auth/jwks') ||
    path.startsWith('/api/auth/introspect') ||
    path.startsWith('/api/domains/resolve')
  );
}

function firstHeaderValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function parseKeyringFromEnv() {
  const defaultSecret = String(process.env.AUTH_JWT_SECRET || '').trim();
  const raw = String(process.env.AUTH_JWT_SECRETS_JSON || '').trim();
  if (!raw) return { defaultSecret, secretsByKid: {} as Record<string, string> };
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const normalized = Object.fromEntries(
      Object.entries(parsed || {})
        .map(([kid, secret]) => [String(kid).trim(), String(secret || '').trim()])
        .filter(([kid, secret]) => kid && secret),
    );
    return { defaultSecret, secretsByKid: normalized };
  } catch {
    return { defaultSecret, secretsByKid: {} as Record<string, string> };
  }
}

@Injectable()
export class AuthContextGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (!authContextEnforced()) return true;

    const req = context.switchToHttp().getRequest();
    const path = String(req.originalUrl || req.url || '').split('?')[0];
    if (isPublicAuthRoute(path)) return true;

    const authHeader = firstHeaderValue(req.headers['authorization']);
    const token = parseAuthorizationBearer(authHeader);
    if (!token) {
      throw new ForbiddenException('Missing bearer token');
    }

    const issuer = String(process.env.AUTH_JWT_ISSUER || '').trim() || undefined;
    const audience = String(process.env.AUTH_JWT_AUDIENCE || '').trim() || undefined;
    try {
      const authContext = parseAuthContextFromJwtWithKeyring(token, parseKeyringFromEnv(), { issuer, audience });
      req.authContext = authContext;
      req.actorId = authContext.actorId;
      req.workspaceIds = authContext.workspaceIds;
      return true;
    } catch (error: any) {
      throw new ForbiddenException(error?.message || 'Invalid bearer token');
    }
  }
}

