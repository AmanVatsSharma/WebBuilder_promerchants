/**
 * @file auth-context.guard.ts
 * @module common/guards
 * @description Optional JWT auth context guard for actor/workspace claims
 * @author BharatERP
 * @created 2026-02-16
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { parseAuthContextFromJwt, parseAuthorizationBearer } from '../auth/auth-context';

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
    path.startsWith('/api/domains/resolve')
  );
}

function firstHeaderValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
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

    const secret = String(process.env.AUTH_JWT_SECRET || '').trim();
    const issuer = String(process.env.AUTH_JWT_ISSUER || '').trim() || undefined;
    const audience = String(process.env.AUTH_JWT_AUDIENCE || '').trim() || undefined;
    try {
      const authContext = parseAuthContextFromJwt(token, secret, { issuer, audience });
      req.authContext = authContext;
      req.actorId = authContext.actorId;
      req.workspaceIds = authContext.workspaceIds;
      return true;
    } catch (error: any) {
      throw new ForbiddenException(error?.message || 'Invalid bearer token');
    }
  }
}

