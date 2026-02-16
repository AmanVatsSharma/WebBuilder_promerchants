/**
 * @file api-key.guard.ts
 * @module common/guards
 * @description Optional global API key guard for deployment hardening
 * @author BharatERP
 * @created 2026-02-16
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

function expectedApiKey() {
  return (process.env.API_AUTH_KEY || '').trim();
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = expectedApiKey();
    if (!expected) return true;

    const req = context.switchToHttp().getRequest();
    const provided = String(req.headers['x-api-key'] || '').trim();
    if (!provided || provided !== expected) {
      throw new ForbiddenException('Invalid API key');
    }
    return true;
  }
}

