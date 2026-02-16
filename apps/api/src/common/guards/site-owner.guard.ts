/**
 * @file site-owner.guard.ts
 * @module common/guards
 * @description Optional site ownership guard using actorId -> Site.ownerId authorization
 * @author BharatERP
 * @created 2026-02-16
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Site } from '../../modules/sites/entities/site.entity';

function ownerEnforced() {
  return String(process.env.ENFORCE_SITE_OWNER || '').toLowerCase() === 'true';
}

function autoClaimOwnerEnabled() {
  const configured = String(process.env.AUTO_CLAIM_SITE_OWNER || '').toLowerCase();
  if (configured === 'false') return false;
  return true;
}

function firstHeaderValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function isProtectedRoute(method: string, path: string) {
  const upperMethod = (method || '').toUpperCase();
  if (!path.startsWith('/api/')) return false;
  if (path.startsWith('/api/domains/resolve')) return false;
  if (upperMethod === 'GET' && !path.startsWith('/api/sites')) return false;
  return true;
}

function resolveSiteId(req: any) {
  const fromParam = String(req.params?.siteId || req.params?.id || '').trim();
  if (fromParam) return fromParam;
  const fromBody = String(req.body?.siteId || '').trim();
  if (fromBody) return fromBody;
  const fromQuery = String(req.query?.siteId || '').trim();
  if (fromQuery) return fromQuery;
  return '';
}

function resolveActorId(req: any) {
  const fromAuth = String(req?.authContext?.actorId || '').trim();
  if (fromAuth) return fromAuth;
  return firstHeaderValue(req?.headers?.['x-actor-id']);
}

function resolveWorkspaceIds(req: any) {
  const fromAuth = Array.isArray(req?.authContext?.workspaceIds)
    ? req.authContext.workspaceIds.map((value: unknown) => String(value || '').trim()).filter(Boolean)
    : [];
  if (fromAuth.length) return fromAuth;

  const fromHeader = firstHeaderValue(req?.headers?.['x-workspace-id']);
  return fromHeader ? [fromHeader] : [];
}

@Injectable()
export class SiteOwnerGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!ownerEnforced()) return true;

    const req = context.switchToHttp().getRequest();
    const method = String(req.method || '').toUpperCase();
    const path = String(req.originalUrl || req.url || '');
    if (!isProtectedRoute(method, path)) return true;

    const actorId = resolveActorId(req);
    if (!actorId) {
      throw new ForbiddenException('Missing actor context');
    }
    req.actorId = actorId;
    req.workspaceIds = resolveWorkspaceIds(req);

    const siteId = resolveSiteId(req);
    if (!siteId) {
      return true;
    }

    const siteRepository = this.dataSource.getRepository(Site);
    const site = await siteRepository.findOne({ where: { id: siteId } });
    if (!site) {
      throw new ForbiddenException('Unknown site scope');
    }

    if (!site.ownerId) {
      if (!autoClaimOwnerEnabled()) {
        throw new ForbiddenException('Site owner not assigned');
      }
      site.ownerId = actorId;
      await siteRepository.save(site);
      return true;
    }

    if (site.ownerId !== actorId) {
      throw new ForbiddenException('Site ownership mismatch');
    }

    const workspaceIds = resolveWorkspaceIds(req);
    if (workspaceIds.length && site.workspaceId && !workspaceIds.includes(site.workspaceId)) {
      throw new ForbiddenException('Workspace membership mismatch');
    }

    return true;
  }
}

