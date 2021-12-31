/**
 * File: apps/api/src/modules/themes/sites-theme.controller.ts
 * Module: themes
 * Purpose: Site theme binding endpoints (install, get current)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 */

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ThemesService } from './themes.service';

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


