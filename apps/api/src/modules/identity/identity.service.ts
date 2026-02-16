/**
 * @file identity.service.ts
 * @module identity
 * @description Identity service for owner registration and JWT login issuance
 * @author BharatERP
 * @created 2026-02-16
 */

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMembership } from './entities/workspace-membership.entity';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';

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

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private readonly membershipRepo: Repository<WorkspaceMembership>,
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
    const token = this.signAuthToken({
      sub: user.id,
      workspaceIds: tokenWorkspaceIds,
    });
    const expiresInSeconds = Number(process.env.AUTH_JWT_TTL_SECONDS || 3600);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    this.logger.log(`login success userId=${user.id} workspaceCount=${tokenWorkspaceIds.length}`);
    return {
      token,
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

  private signAuthToken(payload: { sub: string; workspaceIds: string[] }) {
    const secret = String(process.env.AUTH_JWT_SECRET || '').trim();
    if (!secret) {
      throw new BadRequestException('AUTH_JWT_SECRET is required');
    }
    const now = Math.floor(Date.now() / 1000);
    const ttl = Number(process.env.AUTH_JWT_TTL_SECONDS || 3600);
    const issuer = String(process.env.AUTH_JWT_ISSUER || '').trim();
    const audience = String(process.env.AUTH_JWT_AUDIENCE || '').trim();
    const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = encodeBase64Url(
      JSON.stringify({
        sub: payload.sub,
        workspaceIds: payload.workspaceIds,
        iat: now,
        exp: now + Math.max(300, ttl),
        ...(issuer ? { iss: issuer } : {}),
        ...(audience ? { aud: audience } : {}),
      }),
    );
    const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }
}

