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
import { STORAGE_PROVIDER } from '../../shared/storage/storage.constants';
import type { StorageProvider } from '../../shared/storage/storage.types';
import * as unzipper from 'unzipper';
import { Inject } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';

function defaultVersion() {
  // POC versioning; real pipeline will compute or read from manifest
  return `0.0.1-${Date.now()}`;
}

function isAllowedThemePath(p: string) {
  // allow typical theme source files
  return /\.(tsx|ts|jsx|js|css|json|md)$/i.test(p);
}

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

  async uploadThemeBundle(dto: UploadThemeDto, file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('bundle file is required');
    if (!dto?.name) throw new BadRequestException('name is required');

    this.logger.log(`uploadThemeBundle name=${dto.name} bytes=${file.size}`);

    const theme = await this.themeRepo.save(
      this.themeRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        author: dto.author ?? null,
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
      const entryPath = entry.path.replaceAll('\\', '/');
      if (!entryPath || entryPath.endsWith('/')) continue;
      if (!isAllowedThemePath(entryPath)) {
        this.logger.debug(`Skipping disallowed theme file: ${entryPath}`);
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
    if (!isAllowedThemePath(filePath)) throw new BadRequestException('path extension not allowed');

    const content = await this.storage.readText(`themes/${themeVersionId}/src/${filePath}`);
    return { path: filePath, content };
  }

  async updateThemeFile(themeVersionId: string, filePath: string, content: string) {
    const v = await this.getThemeVersion(themeVersionId);
    if (!filePath) throw new BadRequestException('path is required');
    if (!isAllowedThemePath(filePath)) throw new BadRequestException('path extension not allowed');

    const { size, sha256 } = await this.storage.writeText(`themes/${themeVersionId}/src/${filePath}`, content);
    await this.fileRepo.save(
      this.fileRepo.create({
        themeVersionId,
        path: filePath,
        size,
        sha256,
      }),
    );

    // Any edit returns to DRAFT until built/published
    v.status = 'DRAFT';
    await this.versionRepo.save(v);

    this.logger.log(`updateThemeFile themeVersionId=${themeVersionId} path=${filePath} size=${size}`);
    return { path: filePath, size, sha256 };
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
      if (!isAllowedThemePath(f.rel)) continue;
      const buf = await fs.readFile(f.abs);
      const { size, sha256 } = await this.storage.writeBytes(`themes/${version.id}/src/${f.rel}`, buf);
      await this.fileRepo.save(
        this.fileRepo.create({
          themeVersionId: version.id,
          path: f.rel,
          size,
          sha256,
        }),
      );
      if (f.rel.toLowerCase() === 'manifest.json') {
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


