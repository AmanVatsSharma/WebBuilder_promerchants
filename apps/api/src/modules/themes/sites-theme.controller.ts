/**
 * File: apps/api/src/modules/themes/sites-theme.controller.ts
 * Module: themes
 * Purpose: Site theme binding endpoints (install, get current)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ThemesService } from './themes.service';
import { UpdateThemeSettingsDto } from './dto/update-theme-settings.dto';
import { PublishThemeSettingsDto } from './dto/publish-theme-settings.dto';
import { UpdateThemeLayoutDto } from './dto/update-theme-layout.dto';
import { PublishThemeLayoutDto } from './dto/publish-theme-layout.dto';

@Controller('sites')
export class SitesThemeController {
  constructor(private readonly themesService: ThemesService) {}

  @Post(':siteId/theme/install')
  install(
    @Param('siteId') siteId: string,
    @Body() body: { themeId: string; themeVersionId: string },
  ) {
    return this.themesService.installThemeForSite(siteId, body.themeId, body.themeVersionId);
  }

  @Get(':siteId/theme')
  getInstalled(@Param('siteId') siteId: string) {
    return this.themesService.getInstallForSite(siteId);
  }

  @Get(':siteId/theme/settings')
  getSettings(@Param('siteId') siteId: string) {
    return this.themesService.getThemeSettings(siteId);
  }

  @Put(':siteId/theme/settings/draft')
  updateDraftSettings(@Param('siteId') siteId: string, @Body() dto: UpdateThemeSettingsDto) {
    return this.themesService.updateDraftThemeSettings(siteId, dto);
  }

  @Post(':siteId/theme/settings/publish')
  publishSettings(@Param('siteId') siteId: string, @Body() dto: PublishThemeSettingsDto) {
    return this.themesService.publishThemeSettings(siteId, dto);
  }

  @Get(':siteId/theme/layouts')
  getLayouts(@Param('siteId') siteId: string, @Query('templateId') templateId: string) {
    return this.themesService.getThemeLayouts(siteId, templateId);
  }

  @Put(':siteId/theme/layouts/draft')
  updateDraftLayout(@Param('siteId') siteId: string, @Body() dto: UpdateThemeLayoutDto) {
    return this.themesService.updateDraftThemeLayout(siteId, dto);
  }

  @Post(':siteId/theme/layouts/publish')
  publishLayout(@Param('siteId') siteId: string, @Body() dto: PublishThemeLayoutDto) {
    return this.themesService.publishThemeLayout(siteId, dto);
  }

  @Post(':siteId/theme/publish')
  publish(
    @Param('siteId') siteId: string,
    @Body() body: { themeVersionId?: string; actor?: string },
  ) {
    return this.themesService.publishThemeForSite(siteId, body.themeVersionId, body.actor || 'system');
  }

  @Post(':siteId/theme/rollback')
  rollback(
    @Param('siteId') siteId: string,
    @Body() body: { toThemeVersionId: string; actor?: string },
  ) {
    return this.themesService.rollbackPublishedTheme(siteId, body.toThemeVersionId, body.actor || 'system');
  }

  @Get(':siteId/theme/audits')
  audits(@Param('siteId') siteId: string) {
    return this.themesService.listPublishAudits(siteId);
  }
}


