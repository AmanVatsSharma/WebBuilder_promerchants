/**
 * File: apps/api/src/modules/themes/themes.module.ts
 * Module: themes
 * Purpose: Themes module wiring
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Local filesystem storage is used until StorageProvider is extracted
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from './entities/theme.entity';
import { ThemeVersion } from './entities/theme-version.entity';
import { ThemeFile } from './entities/theme-file.entity';
import { ThemeInstall } from './entities/theme-install.entity';
import { ThemePublishAudit } from './entities/theme-publish-audit.entity';
import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';
import { SitesThemeController } from './sites-theme.controller';
import { StorageModule } from '../../shared/storage/storage.module';
import { ThemeBuildService } from './theme-build.service';
import { ThemeBuildQueueService } from './theme-build-queue.service';

@Module({
  imports: [TypeOrmModule.forFeature([Theme, ThemeVersion, ThemeFile, ThemeInstall, ThemePublishAudit]), StorageModule],
  controllers: [ThemesController, SitesThemeController],
  providers: [ThemesService, ThemeBuildService, ThemeBuildQueueService],
  exports: [ThemesService, ThemeBuildQueueService],
})
export class ThemesModule {}


