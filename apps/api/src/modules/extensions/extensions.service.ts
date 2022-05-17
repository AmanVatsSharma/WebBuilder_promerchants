/**
 * @file extensions.service.ts
 * @module extensions
 * @description Extension lifecycle (upload/build/install + blocks feed for builder)
 * @author BharatERP
 * @created 2026-01-24
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { build, type Plugin } from 'esbuild';
import { assertExtensionManifestV1, type ExtensionManifestV1 } from '@web-builder/contracts';
import { STORAGE_PROVIDER } from '../../shared/storage/storage.constants';
import type { StorageProvider } from '../../shared/storage/storage.types';
import { LoggerService } from '../../shared/logger/logger.service';
import { Extension } from './entities/extension.entity';
import { ExtensionVersion } from './entities/extension-version.entity';
import { ExtensionInstall } from './entities/extension-install.entity';
import { UploadExtensionDto } from './dtos/upload-extension.dto';
import { InstallExtensionDto } from './dtos/install-extension.dto';

function defaultVersion() {
  return '0.0.1';
}

function normalizeRelPath(p: string) {
  const clean = (p || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return clean.startsWith('/') ? clean.slice(1) : clean;
}

function allowImport(spec: string) {
  if (spec.startsWith('./') || spec.startsWith('../')) return true;
  if (spec === 'react') return true;
  if (spec === 'react/jsx-runtime') return true;
  if (spec === '@web-builder/theme-sdk') return true;
  return false;
}

function importAllowlistPlugin(): Plugin {
  return {
    name: 'import-allowlist',
    setup(buildApi) {
      buildApi.onResolve({ filter: /.*/ }, (args) => {
        const spec = args.path;
        if (!allowImport(spec)) {
          return {
            errors: [
              {
                text: `Disallowed import: "${spec}". Allowed: react, react/jsx-runtime, @web-builder/theme-sdk, relative imports`,
              },
            ],
          };
        }
        if (spec === 'react' || spec === 'react/jsx-runtime' || spec === '@web-builder/theme-sdk') {
          return { path: spec, external: true };
        }
        return null;
      });
    },
  };
}

function isAllowedExtensionPath(filePath: string) {
  const p = normalizeRelPath(filePath).toLowerCase();
  if (!p) return false;
  if (p.includes('..')) return false;
  return p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.json') || p.endsWith('.css');
}

function buildWrapperSource(manifest: ExtensionManifestV1) {
  const blocks = manifest.blocks || [];
  const importLines: string[] = [];
  const blockLines: string[] = [];

  blocks.forEach((b, i) => {
    const entry = normalizeRelPath(b.entry);
    const ident = `Block_${i}`;
    importLines.push(`import ${ident} from './${entry}';`);
    blockLines.push(`  ${JSON.stringify(b.type)}: ${ident},`);
  });

  return [
    ...importLines,
    '',
    `export const manifest = ${JSON.stringify(manifest)};`,
    `export const blocks = {`,
    ...blockLines,
    `};`,
    '',
  ].join('\n');
}

@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension) private readonly extRepo: Repository<Extension>,
    @InjectRepository(ExtensionVersion) private readonly versionRepo: Repository<ExtensionVersion>,
    @InjectRepository(ExtensionInstall) private readonly installRepo: Repository<ExtensionInstall>,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly logger: LoggerService,
  ) {}

  async listExtensions() {
    return await this.extRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getExtensionVersion(extensionVersionId: string) {
    const v = await this.versionRepo.findOne({ where: { id: extensionVersionId } });
    if (!v) throw new NotFoundException(`ExtensionVersion not found: ${extensionVersionId}`);
    return v;
  }

  async uploadExtensionBundle(dto: UploadExtensionDto, file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('bundle file is required');
    if (!dto?.name) throw new BadRequestException('name is required');

    this.logger.info('uploadExtensionBundle', { name: dto.name, bytes: file.size });

    const ext = await this.extRepo.save(
      this.extRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        author: dto.author ?? null,
      }),
    );

    const version = await this.versionRepo.save(
      this.versionRepo.create({
        extensionId: ext.id,
        version: dto.version || defaultVersion(),
        status: 'DRAFT',
        manifest: null,
        buildLog: null,
      }),
    );

    await this.storage.ensurePrefix(`extensions/${version.id}/src`);

    const dir = await unzipper.Open.buffer(file.buffer);
    let manifestJson: any = null;

    for (const entry of dir.files) {
      if (entry.type !== 'File') continue;
      const entryPath = entry.path.replaceAll('\\', '/');
      if (!entryPath || entryPath.endsWith('/')) continue;
      if (!isAllowedExtensionPath(entryPath)) {
        this.logger.debug('Skipping disallowed extension file', { path: entryPath });
        continue;
      }
      const content = await entry.buffer();
      await this.storage.writeBytes(`extensions/${version.id}/src/${entryPath}`, content);

      if (entryPath.toLowerCase() === 'extension.manifest.json') {
        try {
          manifestJson = JSON.parse(content.toString('utf-8'));
        } catch (e) {
          this.logger.warn('Invalid extension.manifest.json', { errorMessage: (e as Error).message });
        }
      }
    }

    if (manifestJson) {
      // Validate manifest early so broken extensions fail fast.
      const manifest = assertExtensionManifestV1(manifestJson);
      version.manifest = manifest as any;
      await this.versionRepo.save(version);
    }

    return { extension: ext, extensionVersion: version };
  }

  async buildExtensionVersion(extensionVersionId: string) {
    const version = await this.getExtensionVersion(extensionVersionId);
    const manifest = assertExtensionManifestV1(
      version.manifest || {
        schemaVersion: 1,
        name: 'Unnamed Extension',
        version: version.version,
        blocks: [],
      },
    );

    version.status = 'BUILDING';
    version.buildLog = null;
    await this.versionRepo.save(version);

    const logs: string[] = [];
    try {
      const wrapperSource = buildWrapperSource(manifest);
      await this.storage.ensurePrefix(`extensions/${extensionVersionId}/build`);

      // Build using esbuild (same safety model as themes).
      await build({
        stdin: {
          contents: wrapperSource,
          resolveDir: path.resolve(process.cwd(), 'storage', 'extensions', extensionVersionId, 'src'),
          sourcefile: '__webbuilder_extension_entry.tsx',
          loader: 'tsx',
        },
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'es2020',
        external: ['react', 'react/jsx-runtime', '@web-builder/theme-sdk'],
        outfile: path.resolve(process.cwd(), 'storage', 'extensions', extensionVersionId, 'build', 'extension.cjs'),
        sourcemap: true,
        jsx: 'automatic',
        loader: {
          '.css': 'css',
          '.json': 'json',
        },
        plugins: [importAllowlistPlugin()],
        logLevel: 'silent',
      });

      logs.push('Build succeeded');
      version.status = 'BUILT';
      version.buildLog = logs.join('\n');
      await this.versionRepo.save(version);

      return { extensionVersionId, status: version.status, output: `extensions/${extensionVersionId}/build/extension.cjs` };
    } catch (e: any) {
      const msg = e?.message || String(e);
      this.logger.error('extension build failed', { extensionVersionId, errorMessage: msg, stack: e?.stack });
      logs.push('Build failed');
      logs.push(msg);
      version.status = 'FAILED';
      version.buildLog = logs.join('\n');
      await this.versionRepo.save(version);
      return { extensionVersionId, status: version.status, error: msg };
    }
  }

  async installExtension(siteId: string, dto: InstallExtensionDto) {
    if (!siteId) throw new BadRequestException('siteId is required');
    const v = await this.getExtensionVersion(dto.extensionVersionId);
    if (v.extensionId !== dto.extensionId) throw new BadRequestException('extensionId does not match extensionVersionId');
    if (v.status !== 'BUILT') throw new BadRequestException('extensionVersion must be BUILT before install');

    const existing = await this.installRepo.findOne({ where: { siteId, extensionId: dto.extensionId } });
    const toSave = existing
      ? Object.assign(existing, { extensionVersionId: dto.extensionVersionId, enabled: true })
      : this.installRepo.create({ siteId, extensionId: dto.extensionId, extensionVersionId: dto.extensionVersionId, enabled: true });

    const saved = await this.installRepo.save(toSave);
    this.logger.info('extension installed', { siteId, extensionId: dto.extensionId, extensionVersionId: dto.extensionVersionId });
    return saved;
  }

  async listSiteBlocks(siteId: string) {
    const installs = await this.installRepo.find({ where: { siteId, enabled: true } });
    if (!installs.length) return [];

    const versionIds = installs.map((i) => i.extensionVersionId);
    const versions = await this.versionRepo.find({ where: { id: In(versionIds) } });

    const blocks: Array<{ type: string; label: string; propsSchema?: any; extensionVersionId: string }> = [];
    for (const v of versions) {
      const m = v.manifest as any;
      const manifest = m ? assertExtensionManifestV1(m) : null;
      for (const b of manifest?.blocks || []) {
        blocks.push({
          type: b.type,
          label: b.label,
          propsSchema: b.propsSchema,
          extensionVersionId: v.id,
        });
      }
    }
    return blocks;
  }

  async listSiteInstalls(siteId: string) {
    if (!siteId) throw new BadRequestException('siteId is required');
    return await this.installRepo.find({ where: { siteId, enabled: true } });
  }
}

