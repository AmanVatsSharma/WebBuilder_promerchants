/**
 * File: apps/api/src/modules/themes/theme-build.service.ts
 * Module: themes
 * Purpose: Build (bundle) theme sources into runtime artifacts using esbuild
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - This is the critical security boundary: we enforce strict import allowlist
 * - Output is written to storage under: themes/<themeVersionId>/build/*
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { build, type Plugin } from 'esbuild';
import * as path from 'path';
import * as fs from 'fs/promises';
import { assertThemeManifestV1, type ThemeManifestV1 } from '@web-builder/contracts';
import { ThemeVersion } from './entities/theme-version.entity';

function storageRootDir() {
  return process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage');
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
        return null;
      });
    },
  };
}

function toSafeIdent(input: string) {
  return input.replace(/[^a-zA-Z0-9_]/g, '_');
}

function normalizeThemeRelPath(p: string) {
  const clean = p.replaceAll('\\', '/').replace(/^\.\//, '');
  return clean.startsWith('/') ? clean.slice(1) : clean;
}

function buildWrapperSource(manifest: ThemeManifestV1) {
  const entryRel = normalizeThemeRelPath(manifest.entry || 'entry.tsx');
  const routes = manifest.routes || [];

  const importLines: string[] = [];
  const templateLines: string[] = [];

  routes.forEach((r, i) => {
    const tpl = normalizeThemeRelPath(r.template);
    const ident = `Template_${toSafeIdent(tpl)}_${i}`;
    importLines.push(`import ${ident} from './${tpl}';`);
    templateLines.push(`  ${JSON.stringify(tpl)}: ${ident},`);
  });

  // Note: default export is treated as the Theme Layout by the storefront runtime.
  // It should accept optional `children` (recommended) so storefront can inject the matched template.
  return [
    `import ThemeLayout from './${entryRel}';`,
    ...importLines,
    '',
    `export const manifest = ${JSON.stringify(manifest)};`,
    `export const templates = {`,
    ...templateLines,
    `};`,
    `export default ThemeLayout;`,
    '',
  ].join('\n');
}

@Injectable()
export class ThemeBuildService {
  private readonly logger = new Logger(ThemeBuildService.name);

  constructor(
    @InjectRepository(ThemeVersion) private readonly versionRepo: Repository<ThemeVersion>,
  ) {}

  async buildThemeVersion(themeVersionId: string) {
    const version = await this.versionRepo.findOne({ where: { id: themeVersionId } });
    if (!version) throw new NotFoundException(`ThemeVersion not found: ${themeVersionId}`);

    const manifest = assertThemeManifestV1(
      version.manifest || {
        schemaVersion: 1,
        name: 'Unnamed Theme',
        version: version.version || '0.0.0',
        entry: 'entry.tsx',
        routes: [],
      },
    );

    const srcRoot = path.join(storageRootDir(), 'themes', themeVersionId, 'src');
    const buildRoot = path.join(storageRootDir(), 'themes', themeVersionId, 'build');
    await fs.mkdir(buildRoot, { recursive: true });

    this.logger.log(`buildThemeVersion id=${themeVersionId} entry=${manifest.entry}`);

    version.status = 'BUILDING';
    version.buildLog = null;
    await this.versionRepo.save(version);

    const logs: string[] = [];
    try {
      const wrapperSource = buildWrapperSource(manifest);
      await build({
        stdin: {
          contents: wrapperSource,
          resolveDir: srcRoot,
          sourcefile: '__webbuilder_entry.tsx',
          loader: 'tsx',
        },
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'es2020',
        outfile: path.join(buildRoot, 'theme.cjs'),
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

      return { themeVersionId, status: version.status, output: `themes/${themeVersionId}/build/theme.cjs` };
    } catch (e: any) {
      const msg = e?.message || String(e);
      this.logger.error(`buildThemeVersion failed id=${themeVersionId} ${msg}`);
      logs.push('Build failed');
      logs.push(msg);
      version.status = 'FAILED';
      version.buildLog = logs.join('\n');
      await this.versionRepo.save(version);
      return { themeVersionId, status: version.status, error: msg };
    }
  }
}


