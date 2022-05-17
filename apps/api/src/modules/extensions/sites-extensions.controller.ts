/**
 * @file sites-extensions.controller.ts
 * @module extensions
 * @description Site-scoped extension endpoints (install + blocks feed)
 * @author BharatERP
 * @created 2026-01-24
 */

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExtensionsService } from './extensions.service';
import { InstallExtensionDto } from './dtos/install-extension.dto';

@Controller('sites')
export class SitesExtensionsController {
  constructor(private readonly extensions: ExtensionsService) {}

  @Post(':siteId/extensions/install')
  install(@Param('siteId') siteId: string, @Body() dto: InstallExtensionDto) {
    return this.extensions.installExtension(siteId, dto);
  }

  @Get(':siteId/extensions/blocks')
  listBlocks(@Param('siteId') siteId: string) {
    return this.extensions.listSiteBlocks(siteId);
  }

  @Get(':siteId/extensions')
  listInstalls(@Param('siteId') siteId: string) {
    // Minimal v1 API for storefront to discover installed extensionVersionIds.
    return this.extensions.listSiteInstalls(siteId);
  }
}

