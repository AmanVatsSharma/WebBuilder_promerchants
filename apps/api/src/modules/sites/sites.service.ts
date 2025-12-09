/**
 * @file sites.service.ts
 * @module sites
 * @description Service for sites and pages logic
 * @author BharatERP
 * @created 2025-02-09
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site } from './entities/site.entity';
import { Page } from './entities/page.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
  ) {}

  async createSite(createSiteDto: CreateSiteDto) {
    const site = this.siteRepository.create(createSiteDto);
    return await this.siteRepository.save(site);
  }

  async findAllSites() {
    return await this.siteRepository.find();
  }

  async findOneSite(id: string) {
    const site = await this.siteRepository.findOne({ where: { id }, relations: ['pages'] });
    if (!site) throw new NotFoundException(`Site with ID ${id} not found`);
    return site;
  }

  async createPage(siteId: string, createPageDto: CreatePageDto) {
    const site = await this.findOneSite(siteId);
    const page = this.pageRepository.create({ ...createPageDto, site });
    return await this.pageRepository.save(page);
  }

  async findAllPages(siteId: string) {
    return await this.pageRepository.find({ where: { siteId } });
  }

  async findOnePage(id: string) {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) throw new NotFoundException(`Page with ID ${id} not found`);
    return page;
  }

  async updatePage(id: string, updatePageDto: UpdatePageDto) {
    const page = await this.findOnePage(id);
    Object.assign(page, updatePageDto);
    return await this.pageRepository.save(page);
  }
}

