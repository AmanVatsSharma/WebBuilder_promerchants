/**
 * @file sites.service.ts
 * @module sites
 * @description Service for sites and pages logic
 * @author BharatERP
 * @created 2025-02-09
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Site } from './entities/site.entity';
import { Page } from './entities/page.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

export interface SiteAccessContext {
  actorId?: string;
  workspaceId?: string;
  workspaceIds?: string[];
}

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
  ) {}

  async createSite(createSiteDto: CreateSiteDto, access?: SiteAccessContext) {
    const site = this.siteRepository.create({
      ...createSiteDto,
      ownerId: access?.actorId || createSiteDto.ownerId || null,
      workspaceId: access?.workspaceId || createSiteDto.workspaceId || null,
    });
    return await this.siteRepository.save(site);
  }

  async findAllSites(access?: SiteAccessContext) {
    const workspaceIds = (access?.workspaceIds || []).filter(Boolean);
    if (workspaceIds.length) {
      return await this.siteRepository.find({ where: { workspaceId: In(workspaceIds) } });
    }

    if (access?.actorId) {
      return await this.siteRepository.find({ where: { ownerId: access.actorId } });
    }
    return await this.siteRepository.find();
  }

  async findOneSite(id: string, access?: SiteAccessContext) {
    const workspaceIds = (access?.workspaceIds || []).filter(Boolean);
    let site: Site | null = null;
    if (workspaceIds.length) {
      site = await this.siteRepository.findOne({
        where: { id, workspaceId: In(workspaceIds) },
        relations: ['pages'],
      });
    } else if (access?.actorId) {
      site = await this.siteRepository.findOne({
        where: { id, ownerId: access.actorId },
        relations: ['pages'],
      });
    } else {
      site = await this.siteRepository.findOne({ where: { id }, relations: ['pages'] });
    }

    if (!site) throw new NotFoundException(`Site with ID ${id} not found`);
    return site;
  }

  async createPage(siteId: string, createPageDto: CreatePageDto) {
    const site = await this.findOneSite(siteId);
    const page = this.pageRepository.create({ ...createPageDto, site });
    return await this.pageRepository.save(page);
  }

  async findAllPages(siteId: string) {
    const pages = await this.pageRepository.find({ where: { siteId } });
    // Add small publish metadata useful for the builder.
    return pages.map((p) => ({
      ...p,
      isPublished: Boolean(p.publishedContent),
    }));
  }

  async findOnePage(id: string, mode?: 'draft' | 'published') {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) throw new NotFoundException(`Page with ID ${id} not found`);

    // Storefront default should be published; builder default should be draft.
    if (mode === 'published') {
      return {
        ...page,
        content: page.publishedContent || page.content,
      };
    }

    return page;
  }

  async updatePage(id: string, updatePageDto: UpdatePageDto) {
    const page = await this.findOnePage(id);
    Object.assign(page, updatePageDto);
    return await this.pageRepository.save(page);
  }

  async publishPage(id: string) {
    const page = await this.findOnePage(id);
    page.publishedContent = page.content || {};
    page.publishedAt = new Date();
    const saved = await this.pageRepository.save(page);
    return {
      id: saved.id,
      siteId: saved.siteId,
      publishedAt: saved.publishedAt,
      status: 'PUBLISHED',
    };
  }
}

