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
import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';
import { SitesThemeController } from './sites-theme.controller';
import { StorageModule } from '../../shared/storage/storage.module';
import { ThemeBuildService } from './theme-build.service';

@Module({
  imports: [TypeOrmModule.forFeature([Theme, ThemeVersion, ThemeFile, ThemeInstall]), StorageModule],
  controllers: [ThemesController, SitesThemeController],
  providers: [ThemesService, ThemeBuildService],
  exports: [ThemesService],
})
export class ThemesModule {}


