/**
 * @file sites.controller.ts
 * @module sites
 * @description Controller for sites and pages
 * @author BharatERP
 * @created 2025-02-09
 */
import { Controller, Get, Post, Body, Param, Put, Query, Headers, Req } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

function firstHeaderValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  createSite(@Req() req: any, @Body() createSiteDto: CreateSiteDto, @Headers('x-actor-id') actorHeader?: string) {
    const actorId = String(req?.authContext?.actorId || actorHeader || '').trim() || undefined;
    const workspaceFromAuth = Array.isArray(req?.authContext?.workspaceIds)
      ? String(req.authContext.workspaceIds[0] || '').trim()
      : '';
    const workspaceFromHeader = firstHeaderValue(req?.headers?.['x-workspace-id']);
    const workspaceId = workspaceFromAuth || workspaceFromHeader || undefined;

    return this.sitesService.createSite(createSiteDto, {
      actorId,
      workspaceId,
      workspaceIds: req?.authContext?.workspaceIds,
    });
  }

  @Get()
  findAllSites(@Req() req: any, @Headers('x-actor-id') actorHeader?: string) {
    const actorId = String(req?.authContext?.actorId || actorHeader || '').trim() || undefined;
    return this.sitesService.findAllSites({
      actorId,
      workspaceIds: req?.authContext?.workspaceIds,
    });
  }

  @Get(':id')
  findOneSite(@Req() req: any, @Param('id') id: string, @Headers('x-actor-id') actorHeader?: string) {
    const actorId = String(req?.authContext?.actorId || actorHeader || '').trim() || undefined;
    return this.sitesService.findOneSite(id, {
      actorId,
      workspaceIds: req?.authContext?.workspaceIds,
    });
  }

  @Post(':siteId/pages')
  createPage(@Param('siteId') siteId: string, @Body() createPageDto: CreatePageDto) {
    return this.sitesService.createPage(siteId, createPageDto);
  }

  @Get(':siteId/pages')
  findAllPages(@Param('siteId') siteId: string) {
    return this.sitesService.findAllPages(siteId);
  }

  @Get('pages/:pageId')
  findOnePage(@Param('pageId') pageId: string, @Query('mode') mode?: 'draft' | 'published') {
    return this.sitesService.findOnePage(pageId, mode);
  }

  @Put('pages/:pageId')
  updatePage(@Param('pageId') pageId: string, @Body() updatePageDto: UpdatePageDto) {
    return this.sitesService.updatePage(pageId, updatePageDto);
  }

  /**
   * Publish a page: snapshot draft `content` into `publishedContent`.
   * Storefront should read published content by default.
   */
  @Post('pages/:pageId/publish')
  publishPage(@Param('pageId') pageId: string) {
    return this.sitesService.publishPage(pageId);
  }
}

