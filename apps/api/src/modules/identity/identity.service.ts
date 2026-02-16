/**
 * @file identity.service.ts
 * @module identity
 * @description Identity service for owner registration and JWT login issuance
 * @author BharatERP
 * @created 2026-02-16
 */

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMembership } from './entities/workspace-membership.entity';
import { AuthSession } from './entities/auth-session.entity';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { parseAuthContextFromJwtWithKeyring } from '../../common/auth/auth-context';

const scrypt = promisify(scryptCallback);

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function slugifyWorkspaceName(name: string) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `workspace-${Date.now()}`;
}

function encodeBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function accessTokenTtlSeconds() {
  const value = Number(process.env.AUTH_JWT_TTL_SECONDS || 3600);
  return Number.isFinite(value) ? Math.max(300, Math.floor(value)) : 3600;
}

function refreshTokenTtlSeconds() {
  const value = Number(process.env.AUTH_REFRESH_TTL_SECONDS || 60 * 60 * 24 * 14);
  return Number.isFinite(value) ? Math.max(3600, Math.floor(value)) : 60 * 60 * 24 * 14;
}

function parseSecretKeyring() {
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

function decodeJwtSegment<T>(value: string) {
  const json = Buffer.from(value, 'base64url').toString('utf8');
  return JSON.parse(json) as T;
}

function decodeJwt(token: string) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new UnauthorizedException('Invalid token format');
  const [headerSegment, payloadSegment] = parts;
  return {
    header: decodeJwtSegment<Record<string, unknown>>(headerSegment),
    payload: decodeJwtSegment<Record<string, unknown>>(payloadSegment),
  };
}

function secretFingerprint(secret: string) {
  return createHash('sha256').update(secret).digest('hex').slice(0, 16);
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [salt, expectedHash] = String(passwordHash || '').split(':');
  if (!salt || !expectedHash) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return key.toString('hex') === expectedHash;
}

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);
  private oidcDiscoveryCache: { expiresAt: number; data: unknown } | null = null;
  private oidcJwksCache: { expiresAt: number; data: unknown } | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private readonly membershipRepo: Repository<WorkspaceMembership>,
    @InjectRepository(AuthSession)
    private readonly sessionRepo: Repository<AuthSession>,
  ) {}

  async registerOwner(dto: RegisterOwnerDto) {
    const email = normalizeEmail(dto.email);
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const workspaceName = String(dto.workspaceName || '').trim();
    if (!workspaceName) throw new BadRequestException('workspaceName is required');

    const passwordHash = await hashPassword(dto.password);
    const user = await this.userRepo.save(
      this.userRepo.create({
        email,
        passwordHash,
        name: dto.name?.trim() || null,
      }),
    );

    const baseSlug = slugifyWorkspaceName(workspaceName);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.workspaceRepo.findOne({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const workspace = await this.workspaceRepo.save(
      this.workspaceRepo.create({
        name: workspaceName,
        slug,
      }),
    );

    await this.membershipRepo.save(
      this.membershipRepo.create({
        userId: user.id,
        workspaceId: workspace.id,
        role: 'OWNER',
      }),
    );

    this.logger.log(`registerOwner email=${email} workspaceId=${workspace.id}`);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
    };
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const memberships = await this.membershipRepo.find({ where: { userId: user.id } });
    const workspaceIds = memberships.map((membership) => membership.workspaceId);
    if (!workspaceIds.length) throw new UnauthorizedException('No workspace memberships found');

    const workspaceIdFilter = String(dto.workspaceId || '').trim();
    if (workspaceIdFilter && !workspaceIds.includes(workspaceIdFilter)) {
      throw new UnauthorizedException('Workspace membership missing');
    }

    const tokenWorkspaceIds = workspaceIdFilter ? [workspaceIdFilter] : workspaceIds;
    const session = await this.createSession(user.id, tokenWorkspaceIds);
    const token = this.signAuthToken({ sub: user.id, workspaceIds: tokenWorkspaceIds });
    const expiresAt = new Date(Date.now() + accessTokenTtlSeconds() * 1000).toISOString();

    this.logger.log(`login success userId=${user.id} workspaceCount=${tokenWorkspaceIds.length}`);
    return {
      token,
      refreshToken: session.refreshToken,
      tokenType: 'Bearer',
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
      },
      workspaceIds: tokenWorkspaceIds,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const incomingRefreshToken = String(dto.refreshToken || '').trim();
    if (!incomingRefreshToken) throw new UnauthorizedException('Refresh token missing');

    const refreshTokenHash = hashRefreshToken(incomingRefreshToken);
    const session = await this.sessionRepo.findOne({ where: { refreshTokenHash } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('Session user not found');

    const nextRefreshToken = randomUUID().replace(/-/g, '') + randomBytes(16).toString('hex');
    session.refreshTokenHash = hashRefreshToken(nextRefreshToken);
    session.expiresAt = new Date(Date.now() + refreshTokenTtlSeconds() * 1000);
    session.revokedAt = null;
    await this.sessionRepo.save(session);

    const workspaceIds = Array.isArray(session.workspaceIds) ? session.workspaceIds : [];
    const token = this.signAuthToken({ sub: user.id, workspaceIds });
    const expiresAt = new Date(Date.now() + accessTokenTtlSeconds() * 1000).toISOString();

    this.logger.log(`refresh success userId=${user.id} workspaceCount=${workspaceIds.length}`);
    return {
      token,
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
      },
      workspaceIds,
    };
  }

  async logout(dto: LogoutDto) {
    const incomingRefreshToken = String(dto.refreshToken || '').trim();
    if (!incomingRefreshToken) throw new UnauthorizedException('Refresh token missing');

    const refreshTokenHash = hashRefreshToken(incomingRefreshToken);
    const session = await this.sessionRepo.findOne({ where: { refreshTokenHash } });
    if (!session) {
      return { status: 'LOGGED_OUT' };
    }

    session.revokedAt = new Date();
    await this.sessionRepo.save(session);
    return { status: 'LOGGED_OUT' };
  }

  getJwksMetadata() {
    const keyring = parseSecretKeyring();
    const keys = Object.entries(keyring.secretsByKid).map(([kid, secretValue]) => {
      const secret = String(secretValue || '');
      return {
      kid,
      kty: 'oct',
      use: 'sig',
      alg: 'HS256',
      // Security: expose fingerprint only, never raw symmetric secret.
      xSecretFingerprint: secretFingerprint(secret),
      };
    });
    if (!keys.length && keyring.defaultSecret) {
      keys.push({
        kid: 'default',
        kty: 'oct',
        use: 'sig',
        alg: 'HS256',
        xSecretFingerprint: secretFingerprint(keyring.defaultSecret),
      });
    }
    return {
      keys,
      activeKid: String(process.env.AUTH_JWT_ACTIVE_KID || '').trim() || null,
    };
  }

  introspectToken(token: string) {
    const keyring = parseSecretKeyring();
    try {
      const authContext = parseAuthContextFromJwtWithKeyring(token, keyring, {
        issuer: String(process.env.AUTH_JWT_ISSUER || '').trim() || undefined,
        audience: String(process.env.AUTH_JWT_AUDIENCE || '').trim() || undefined,
      });
      const decoded = decodeJwt(token);
      return {
        active: true,
        actorId: authContext.actorId,
        workspaceIds: authContext.workspaceIds,
        exp: decoded.payload.exp || null,
        iat: decoded.payload.iat || null,
        kid: decoded.header.kid || null,
      };
    } catch {
      return {
        active: false,
      };
    }
  }

  async getOidcDiscovery() {
    const url = String(process.env.AUTH_OIDC_DISCOVERY_URL || '').trim();
    if (!url) throw new BadRequestException('AUTH_OIDC_DISCOVERY_URL is required');

    const now = Date.now();
    if (this.oidcDiscoveryCache && this.oidcDiscoveryCache.expiresAt > now) {
      return this.oidcDiscoveryCache.data;
    }

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new BadRequestException(`OIDC discovery fetch failed: ${response.status}`);
    }
    const data = await response.json();
    const ttlMs = Number(process.env.AUTH_OIDC_CACHE_TTL_MS || 300000);
    this.oidcDiscoveryCache = {
      expiresAt: now + Math.max(5000, ttlMs),
      data,
    };
    return data;
  }

  async getOidcJwks() {
    const explicitJwksUrl = String(process.env.AUTH_OIDC_JWKS_URL || '').trim();
    let jwksUrl = explicitJwksUrl;
    if (!jwksUrl) {
      const discovery = (await this.getOidcDiscovery()) as Record<string, unknown>;
      jwksUrl = String(discovery.jwks_uri || '').trim();
    }
    if (!jwksUrl) throw new BadRequestException('OIDC jwks_uri is not configured');

    const now = Date.now();
    if (this.oidcJwksCache && this.oidcJwksCache.expiresAt > now) {
      return this.oidcJwksCache.data;
    }

    const response = await fetch(jwksUrl, { method: 'GET' });
    if (!response.ok) {
      throw new BadRequestException(`OIDC JWKS fetch failed: ${response.status}`);
    }
    const data = await response.json();
    const ttlMs = Number(process.env.AUTH_OIDC_CACHE_TTL_MS || 300000);
    this.oidcJwksCache = {
      expiresAt: now + Math.max(5000, ttlMs),
      data,
    };
    return data;
  }

  private async createSession(userId: string, workspaceIds: string[]) {
    const refreshToken = randomUUID().replace(/-/g, '') + randomBytes(16).toString('hex');
    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        userId,
        workspaceIds,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTokenTtlSeconds() * 1000),
        revokedAt: null,
      }),
    );
    return { ...session, refreshToken };
  }

  private signAuthToken(payload: { sub: string; workspaceIds: string[] }) {
    const keyring = parseSecretKeyring();
    const preferredKid = String(process.env.AUTH_JWT_ACTIVE_KID || '').trim();
    const kidFromMap = preferredKid && keyring.secretsByKid[preferredKid] ? preferredKid : '';
    const fallbackKid = Object.keys(keyring.secretsByKid)[0] || '';
    const kid = kidFromMap || fallbackKid || '';
    const secret = kid ? keyring.secretsByKid[kid] : keyring.defaultSecret;
    if (!secret) {
      throw new BadRequestException('AUTH_JWT_SECRET is required');
    }
    const now = Math.floor(Date.now() / 1000);
    const ttl = accessTokenTtlSeconds();
    const issuer = String(process.env.AUTH_JWT_ISSUER || '').trim();
    const audience = String(process.env.AUTH_JWT_AUDIENCE || '').trim();
    const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT', ...(kid ? { kid } : {}) }));
    const body = encodeBase64Url(
      JSON.stringify({
        sub: payload.sub,
        workspaceIds: payload.workspaceIds,
        iat: now,
        exp: now + ttl,
        ...(issuer ? { iss: issuer } : {}),
        ...(audience ? { aud: audience } : {}),
      }),
    );
    const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }
}

