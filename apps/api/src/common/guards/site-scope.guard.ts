/**
 * @file site-scope.guard.ts
 * @module common/guards
 * @description Optional site scope guard for site-scoped route authorization
 * @author BharatERP
 * @created 2026-02-16
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

function siteScopeEnforced() {
  return String(process.env.ENFORCE_SITE_SCOPE || '').toLowerCase() === 'true';
}

@Injectable()
export class SiteScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (!siteScopeEnforced()) return true;

    const req = context.switchToHttp().getRequest();
    const siteIdInRoute = String(req.params?.siteId || '').trim();
    if (!siteIdInRoute) return true;

    const siteIdHeader = String(req.headers['x-site-id'] || '').trim();
    if (!siteIdHeader || siteIdHeader !== siteIdInRoute) {
      throw new ForbiddenException('Site scope mismatch');
    }

    return true;
  }
}

