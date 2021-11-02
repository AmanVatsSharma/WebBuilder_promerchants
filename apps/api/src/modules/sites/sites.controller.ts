/**
 * @file sites.controller.ts
 * @module sites
 * @description Controller for sites and pages
 * @author BharatERP
 * @created 2025-02-09
 */
import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  createSite(@Body() createSiteDto: CreateSiteDto) {
    return this.sitesService.createSite(createSiteDto);
  }

  @Get()
  findAllSites() {
    return this.sitesService.findAllSites();
  }

  @Get(':id')
  findOneSite(@Param('id') id: string) {
    return this.sitesService.findOneSite(id);
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
  findOnePage(@Param('pageId') pageId: string) {
    return this.sitesService.findOnePage(pageId);
  }

  @Put('pages/:pageId')
  updatePage(@Param('pageId') pageId: string, @Body() updatePageDto: UpdatePageDto) {
    return this.sitesService.updatePage(pageId, updatePageDto);
  }
}

