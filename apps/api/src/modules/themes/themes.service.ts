/**
 * File: apps/api/src/modules/themes/themes.service.ts
 * Module: themes
 * Purpose: Theme store core operations (upload bundle, file CRUD, install binding)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Uses local filesystem storage for now; will be replaced by StorageProvider abstraction
 * - Adds verbose logs for early-stage debugging
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './entities/theme.entity';
import { ThemeVersion } from './entities/theme-version.entity';
import { ThemeFile } from './entities/theme-file.entity';
import { ThemeInstall } from './entities/theme-install.entity';
import { ThemePublishAudit } from './entities/theme-publish-audit.entity';
import { UploadThemeDto } from './dto/upload-theme.dto';
import type { UpdateThemeSettingsDto } from './dto/update-theme-settings.dto';
import type { PublishThemeSettingsDto } from './dto/publish-theme-settings.dto';
import type { UpdateThemeLayoutDto } from './dto/update-theme-layout.dto';
import type { PublishThemeLayoutDto } from './dto/publish-theme-layout.dto';
import { STORAGE_PROVIDER } from '../../shared/storage/storage.constants';
import type { StorageProvider } from '../../shared/storage/storage.types';
import * as unzipper from 'unzipper';
import { Inject } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { assertThemeManifestV1 } from '@web-builder/contracts';

function defaultVersion() {
  // POC versioning; real pipeline will compute or read from manifest
  return `0.0.1-${Date.now()}`;
}

function normalizePricingModel(raw?: string) {
  return String(raw || '').toUpperCase() === 'PAID' ? 'PAID' : 'FREE';
}

function normalizePriceCents(raw: unknown, pricingModel: 'FREE' | 'PAID') {
  if (pricingModel !== 'PAID') return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function normalizeCurrency(raw?: string) {
  const value = String(raw || '').trim().toUpperCase();
  return value.length === 3 ? value : 'USD';
}

function normalizeListed(raw?: string) {
  return String(raw || '').trim().toLowerCase() === 'true';
}

function normalizeThemeSourcePath(rawPath: string): string | null {
  const normalized = (rawPath || '').replace(/\\/g, '/').replace(/^\.\/+/, '').trim();
  if (!normalized) return null;
  if (normalized.startsWith('/')) return null;
  if (normalized.includes('\0')) return null;
  const segments = normalized.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    return null;
  }

  // Allow typical theme source files only.
  if (!/\.(tsx|ts|jsx|js|css|json|md)$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

type SiteThemeSettingsStored = {
  themeVersionId: string | null;
  settings: Record<string, unknown>;
};

type SiteThemeLayoutStored = {
  themeVersionId: string | null;
  layout: Record<string, unknown>;
};

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name);

  constructor(
    @InjectRepository(Theme) private readonly themeRepo: Repository<Theme>,
    @InjectRepository(ThemeVersion) private readonly versionRepo: Repository<ThemeVersion>,
    @InjectRepository(ThemeFile) private readonly fileRepo: Repository<ThemeFile>,
    @InjectRepository(ThemeInstall) private readonly installRepo: Repository<ThemeInstall>,
    @InjectRepository(ThemePublishAudit) private readonly auditRepo: Repository<ThemePublishAudit>,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  private draftSettingsKey(siteId: string) {
    return `sites/${siteId}/theme/settings/draft.json`;
  }

  private publishedSettingsKey(siteId: string) {
    return `sites/${siteId}/theme/settings/published.json`;
  }

  private normalizeTemplateId(templateId: string) {
    const clean = String(templateId || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!clean) throw new BadRequestException('templateId is required');
    if (clean.includes('..')) throw new BadRequestException('templateId traversal not allowed');
    return clean;
  }

  private draftLayoutKey(siteId: string, templateId: string) {
    const tid = this.normalizeTemplateId(templateId);
    return `sites/${siteId}/theme/layouts/draft/${tid}.json`;
  }

  private publishedLayoutKey(siteId: string, templateId: string) {
    const tid = this.normalizeTemplateId(templateId);
    return `sites/${siteId}/theme/layouts/published/${tid}.json`;
  }

  private async readSettingsKey(key: string): Promise<SiteThemeSettingsStored> {
    const exists = await this.storage.exists(key);
    if (!exists) return { themeVersionId: null, settings: {} };
    const text = await this.storage.readText(key);
    try {
      const parsed = JSON.parse(text) as SiteThemeSettingsStored;
      return {
        themeVersionId: typeof parsed?.themeVersionId === 'string' ? parsed.themeVersionId : null,
        settings: parsed?.settings && typeof parsed.settings === 'object' ? (parsed.settings as Record<string, unknown>) : {},
      };
    } catch {
      return { themeVersionId: null, settings: {} };
    }
  }

  private async readLayoutKey(key: string): Promise<SiteThemeLayoutStored> {
    const exists = await this.storage.exists(key);
    if (!exists) return { themeVersionId: null, layout: {} };
    const text = await this.storage.readText(key);
    try {
      const parsed = JSON.parse(text) as SiteThemeLayoutStored;
      return {
        themeVersionId: typeof parsed?.themeVersionId === 'string' ? parsed.themeVersionId : null,
        layout: parsed?.layout && typeof parsed.layout === 'object' ? (parsed.layout as Record<string, unknown>) : {},
      };
    } catch {
      return { themeVersionId: null, layout: {} };
    }
  }

  async listThemes() {
    return await this.themeRepo.find({ relations: ['versions'] });
  }

  async getTheme(themeId: string) {
    const theme = await this.themeRepo.findOne({ where: { id: themeId }, relations: ['versions'] });
    if (!theme) throw new NotFoundException(`Theme not found: ${themeId}`);
    return theme;
  }

  async getThemeVersion(themeVersionId: string) {
    const v = await this.versionRepo.findOne({ where: { id: themeVersionId } });
    if (!v) throw new NotFoundException(`ThemeVersion not found: ${themeVersionId}`);
    return v;
  }

  async getThemeSettings(siteId: string) {
    const [draft, published] = await Promise.all([
      this.readSettingsKey(this.draftSettingsKey(siteId)),
      this.readSettingsKey(this.publishedSettingsKey(siteId)),
    ]);
    return { siteId, draft, published };
  }

  async updateDraftThemeSettings(siteId: string, dto: UpdateThemeSettingsDto) {
    const install = await this.getInstallForSite(siteId);
    const themeVersionId = dto.themeVersionId || install.draftThemeVersionId || install.publishedThemeVersionId;
    if (!themeVersionId) throw new BadRequestException('themeVersionId is required (or install a theme first)');

    const v = await this.getThemeVersion(themeVersionId);
    // Shallow validation against manifest existence (deeper schema validation comes later)
    if (v.manifest) assertThemeManifestV1(v.manifest as any);

    const stored: SiteThemeSettingsStored = {
      themeVersionId,
      settings: dto.settings || {},
    };

    await this.storage.ensurePrefix(path.posix.dirname(this.draftSettingsKey(siteId)));
    await this.storage.writeText(this.draftSettingsKey(siteId), JSON.stringify(stored, null, 2));
    this.logger.log(`updateDraftThemeSettings siteId=${siteId} themeVersionId=${themeVersionId}`);

    return { siteId, draft: stored };
  }

  async publishThemeSettings(siteId: string, dto: PublishThemeSettingsDto) {
    const install = await this.getInstallForSite(siteId);
    const themeVersionId = dto.themeVersionId || install.draftThemeVersionId || install.publishedThemeVersionId;
    if (!themeVersionId) throw new BadRequestException('themeVersionId is required (or install a theme first)');

    const draft = await this.readSettingsKey(this.draftSettingsKey(siteId));
    const toPublish: SiteThemeSettingsStored = {
      themeVersionId,
      settings: draft.settings || {},
    };

    await this.storage.ensurePrefix(path.posix.dirname(this.publishedSettingsKey(siteId)));
    await this.storage.writeText(this.publishedSettingsKey(siteId), JSON.stringify(toPublish, null, 2));
    this.logger.log(`publishThemeSettings siteId=${siteId} themeVersionId=${themeVersionId}`);

    return { siteId, published: toPublish };
  }

  async getThemeLayouts(siteId: string, templateId: string) {
    const [draft, published] = await Promise.all([
      this.readLayoutKey(this.draftLayoutKey(siteId, templateId)),
      this.readLayoutKey(this.publishedLayoutKey(siteId, templateId)),
    ]);
    return { siteId, templateId: this.normalizeTemplateId(templateId), draft, published };
  }

  async updateDraftThemeLayout(siteId: string, dto: UpdateThemeLayoutDto) {
    const install = await this.getInstallForSite(siteId);
    const themeVersionId = dto.themeVersionId || install.draftThemeVersionId || install.publishedThemeVersionId;
    if (!themeVersionId) throw new BadRequestException('themeVersionId is required (or install a theme first)');
    if (!dto.templateId) throw new BadRequestException('templateId is required');
    if (!dto.layout || typeof dto.layout !== 'object') throw new BadRequestException('layout is required');

    const key = this.draftLayoutKey(siteId, dto.templateId);
    const stored: SiteThemeLayoutStored = { themeVersionId, layout: dto.layout };
    await this.storage.ensurePrefix(path.posix.dirname(key));
    await this.storage.writeText(key, JSON.stringify(stored, null, 2));
    this.logger.log(`updateDraftThemeLayout siteId=${siteId} themeVersionId=${themeVersionId} templateId=${dto.templateId}`);
    return { siteId, templateId: this.normalizeTemplateId(dto.templateId), draft: stored };
  }

  async publishThemeLayout(siteId: string, dto: PublishThemeLayoutDto) {
    const install = await this.getInstallForSite(siteId);
    const themeVersionId = dto.themeVersionId || install.draftThemeVersionId || install.publishedThemeVersionId;
    if (!themeVersionId) throw new BadRequestException('themeVersionId is required (or install a theme first)');
    if (!dto.templateId) throw new BadRequestException('templateId is required');

    const draft = await this.readLayoutKey(this.draftLayoutKey(siteId, dto.templateId));
    const stored: SiteThemeLayoutStored = { themeVersionId, layout: draft.layout || {} };
    const key = this.publishedLayoutKey(siteId, dto.templateId);
    await this.storage.ensurePrefix(path.posix.dirname(key));
    await this.storage.writeText(key, JSON.stringify(stored, null, 2));
    this.logger.log(`publishThemeLayout siteId=${siteId} themeVersionId=${themeVersionId} templateId=${dto.templateId}`);
    return { siteId, templateId: this.normalizeTemplateId(dto.templateId), published: stored };
  }

  async uploadThemeBundle(dto: UploadThemeDto, file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('bundle file is required');
    if (!dto?.name) throw new BadRequestException('name is required');

    this.logger.log(`uploadThemeBundle name=${dto.name} bytes=${file.size}`);

    const pricingModel = normalizePricingModel(dto.pricingModel);
    const priceCents = normalizePriceCents(dto.priceCents, pricingModel);
    const currency = normalizeCurrency(dto.currency);
    const licenseType = String(dto.licenseType || 'SINGLE_STORE').trim() || 'SINGLE_STORE';
    const isListed = normalizeListed(dto.isListed);

    const theme = await this.themeRepo.save(
      this.themeRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        author: dto.author ?? null,
        pricingModel,
        priceCents,
        currency,
        licenseType,
        isListed,
      }),
    );

    const version = await this.versionRepo.save(
      this.versionRepo.create({
        themeId: theme.id,
        version: dto.version || defaultVersion(),
        status: 'DRAFT',
      }),
    );

    await this.storage.ensurePrefix(`themes/${version.id}/src`);

    // Extract zip (buffer) into storage and register files
    const dir = await unzipper.Open.buffer(file.buffer);
    let manifestJson: any = null;
    for (const entry of dir.files) {
      if (entry.type !== 'File') continue;
      const entryPath = normalizeThemeSourcePath(entry.path);
      if (!entryPath) {
        this.logger.debug(`Skipping disallowed theme file: ${entry.path}`);
        continue;
      }
      const content = await entry.buffer();
      const { size, sha256 } = await this.storage.writeBytes(`themes/${version.id}/src/${entryPath}`, content);

      if (entryPath.toLowerCase() === 'manifest.json') {
        try {
          manifestJson = JSON.parse(content.toString('utf-8'));
        } catch (e) {
          this.logger.warn(`Invalid manifest.json: ${(e as Error).message}`);
        }
      }

      await this.fileRepo.save(
        this.fileRepo.create({
          themeVersionId: version.id,
          path: entryPath,
          size,
          sha256,
        }),
      );
    }

    if (manifestJson) {
      version.manifest = manifestJson;
      await this.versionRepo.save(version);
    }

    return { theme, themeVersion: version };
  }

  async listThemeFiles(themeVersionId: string) {
    await this.getThemeVersion(themeVersionId);
    return await this.fileRepo.find({ where: { themeVersionId }, order: { path: 'ASC' } });
  }

  async readThemeFile(themeVersionId: string, filePath: string) {
    await this.getThemeVersion(themeVersionId);
    if (!filePath) throw new BadRequestException('path is required');
    const normalizedPath = normalizeThemeSourcePath(filePath);
    if (!normalizedPath) {
      throw new BadRequestException('path is invalid or extension is not allowed');
    }

    const content = await this.storage.readText(`themes/${themeVersionId}/src/${normalizedPath}`);
    return { path: normalizedPath, content };
  }

  async updateThemeFile(themeVersionId: string, filePath: string, content: string) {
    const v = await this.getThemeVersion(themeVersionId);
    if (!filePath) throw new BadRequestException('path is required');
    const normalizedPath = normalizeThemeSourcePath(filePath);
    if (!normalizedPath) {
      throw new BadRequestException('path is invalid or extension is not allowed');
    }

    const { size, sha256 } = await this.storage.writeText(
      `themes/${themeVersionId}/src/${normalizedPath}`,
      content,
    );
    await this.fileRepo.save(
      this.fileRepo.create({
        themeVersionId,
        path: normalizedPath,
        size,
        sha256,
      }),
    );

    // Any edit returns to DRAFT until built/published
    v.status = 'DRAFT';
    await this.versionRepo.save(v);

    this.logger.log(`updateThemeFile themeVersionId=${themeVersionId} path=${normalizedPath} size=${size}`);
    return { path: normalizedPath, size, sha256 };
  }

  async installThemeForSite(siteId: string, themeId: string, themeVersionId: string) {
    await this.getTheme(themeId);
    const v = await this.getThemeVersion(themeVersionId);
    if (v.themeId !== themeId) throw new BadRequestException('themeVersion does not belong to theme');

    const existing = await this.installRepo.findOne({ where: { siteId } });
    const install = existing
      ? Object.assign(existing, { themeId, draftThemeVersionId: themeVersionId })
      : this.installRepo.create({ siteId, themeId, draftThemeVersionId: themeVersionId, publishedThemeVersionId: null });

    this.logger.log(`installThemeForSite siteId=${siteId} themeId=${themeId} themeVersionId=${themeVersionId}`);
    return await this.installRepo.save(install);
  }

  async getInstallForSite(siteId: string) {
    const install = await this.installRepo.findOne({ where: { siteId } });
    if (!install) throw new NotFoundException(`No theme installed for siteId=${siteId}`);
    return install;
  }

  /**
   * Publish a theme version for a site.
   * - If themeVersionId is omitted, publishes the current draftThemeVersionId
   */
  async publishThemeForSite(siteId: string, themeVersionId?: string, actor = 'system') {
    const install = await this.getInstallForSite(siteId);
    const toId = themeVersionId || install.draftThemeVersionId;
    if (!toId) throw new BadRequestException('No draft theme version to publish');

    // Ensure version exists
    await this.getThemeVersion(toId);

    const fromId = install.publishedThemeVersionId || null;
    install.publishedThemeVersionId = toId;
    await this.installRepo.save(install);

    await this.auditRepo.save(
      this.auditRepo.create({
        siteId,
        fromThemeVersionId: fromId,
        toThemeVersionId: toId,
        actor,
        action: 'PUBLISH',
      }),
    );

    this.logger.log(`publishThemeForSite siteId=${siteId} from=${fromId} to=${toId}`);
    return install;
  }

  async rollbackPublishedTheme(siteId: string, toThemeVersionId: string, actor = 'system') {
    const install = await this.getInstallForSite(siteId);
    const fromId = install.publishedThemeVersionId || null;
    if (!toThemeVersionId) throw new BadRequestException('toThemeVersionId is required');
    await this.getThemeVersion(toThemeVersionId);

    install.publishedThemeVersionId = toThemeVersionId;
    await this.installRepo.save(install);

    await this.auditRepo.save(
      this.auditRepo.create({
        siteId,
        fromThemeVersionId: fromId,
        toThemeVersionId,
        actor,
        action: 'ROLLBACK',
      }),
    );

    this.logger.log(`rollbackPublishedTheme siteId=${siteId} from=${fromId} to=${toThemeVersionId}`);
    return install;
  }

  async listPublishAudits(siteId: string) {
    return await this.auditRepo.find({ where: { siteId }, order: { createdAt: 'DESC' } });
  }

  /**
   * Seed the built-in default ecommerce theme from repo files.
   * This is used to give every new platform install a usable starter theme.
   */
  async seedDefaultTheme() {
    const themeName = 'Default Ecommerce';
    const existing = await this.themeRepo.findOne({ where: { name: themeName } });
    if (existing) {
      this.logger.log(`seedDefaultTheme: already exists themeId=${existing.id}`);
      const latest = await this.versionRepo.findOne({ where: { themeId: existing.id }, order: { createdAt: 'DESC' } });
      return { theme: existing, themeVersion: latest };
    }

    const theme = await this.themeRepo.save(
      this.themeRepo.create({
        name: themeName,
        description: 'Starter ecommerce theme shipped with the platform.',
        author: 'WebBuilder',
        pricingModel: 'FREE',
        priceCents: null,
        currency: 'USD',
        licenseType: 'SINGLE_STORE',
        isListed: true,
      }),
    );

    const version = await this.versionRepo.save(
      this.versionRepo.create({
        themeId: theme.id,
        version: '1.0.0',
        status: 'DRAFT',
      }),
    );

    const srcRoot = path.resolve(process.cwd(), 'libs', 'default-theme', 'theme');
    this.logger.log(`seedDefaultTheme: reading from ${srcRoot}`);
    await this.storage.ensurePrefix(`themes/${version.id}/src`);

    const files: Array<{ rel: string; abs: string }> = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) await walk(abs);
        else files.push({ abs, rel: path.relative(srcRoot, abs).replace(/\\/g, '/') });
      }
    };
    await walk(srcRoot);

    let manifestJson: any = null;
    for (const f of files) {
      const normalizedPath = normalizeThemeSourcePath(f.rel);
      if (!normalizedPath) continue;
      const buf = await fs.readFile(f.abs);
      const { size, sha256 } = await this.storage.writeBytes(
        `themes/${version.id}/src/${normalizedPath}`,
        buf,
      );
      await this.fileRepo.save(
        this.fileRepo.create({
          themeVersionId: version.id,
          path: normalizedPath,
          size,
          sha256,
        }),
      );
      if (normalizedPath.toLowerCase() === 'manifest.json') {
        try {
          manifestJson = JSON.parse(buf.toString('utf-8'));
        } catch (e) {
          this.logger.warn(`seedDefaultTheme: invalid manifest.json ${(e as Error).message}`);
        }
      }
    }

    if (manifestJson) {
      version.manifest = manifestJson;
      await this.versionRepo.save(version);
    }

    return { theme, themeVersion: version };
  }
}


