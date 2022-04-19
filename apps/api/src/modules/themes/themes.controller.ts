/**
 * File: apps/api/src/modules/themes/themes.controller.ts
 * Module: themes
 * Purpose: Themes endpoints (Theme Store + file CRUD + install binding)
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Upload uses multipart/form-data with field `bundle`
 */

import { Body, Controller, Get, Param, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ThemesService } from './themes.service';
import { UploadThemeDto } from './dto/upload-theme.dto';
import { UpdateThemeFileDto } from './dto/update-theme-file.dto';
import { ThemeBuildQueueService } from './theme-build-queue.service';

@Controller('themes')
export class ThemesController {
  constructor(
    private readonly themesService: ThemesService,
    private readonly buildQueue: ThemeBuildQueueService,
  ) {}

  @Get()
  listThemes() {
    return this.themesService.listThemes();
  }

  @Get(':themeId')
  getTheme(@Param('themeId') themeId: string) {
    return this.themesService.getTheme(themeId);
  }

  @Get('versions/:themeVersionId')
  getVersion(@Param('themeVersionId') themeVersionId: string) {
    return this.themesService.getThemeVersion(themeVersionId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('bundle'))
  upload(@Body() dto: UploadThemeDto, @UploadedFile() file: Express.Multer.File) {
    return this.themesService.uploadThemeBundle(dto, file);
  }

  /**
   * Seed the platform with a default ecommerce theme.
   * This reads files from `libs/default-theme/theme`.
   */
  @Post('seed/default')
  seedDefault() {
    return this.themesService.seedDefaultTheme();
  }

  /**
   * Build (bundle) a ThemeVersion into runtime artifacts.
   * Output: storage/themes/<themeVersionId>/build/theme.cjs
   */
  @Post('versions/:themeVersionId/build')
  build(@Param('themeVersionId') themeVersionId: string, @Req() req: Request) {
    // pino-http genReqId sets req.id; fallback to header if present.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestId = (req as any)?.id || (req.headers as any)?.requestId || req.headers['x-request-id'] || null;
    return this.buildQueue.enqueue(themeVersionId, typeof requestId === 'string' ? requestId : null);
  }

  @Get('build-jobs/:jobId')
  getBuildJob(@Param('jobId') jobId: string) {
    return this.buildQueue.getJob(jobId);
  }

  @Get('versions/:themeVersionId/files')
  listFiles(@Param('themeVersionId') themeVersionId: string) {
    return this.themesService.listThemeFiles(themeVersionId);
  }

  @Get('versions/:themeVersionId/file')
  readFile(@Param('themeVersionId') themeVersionId: string, @Query('path') path: string) {
    return this.themesService.readThemeFile(themeVersionId, path);
  }

  @Put('versions/:themeVersionId/file')
  updateFile(
    @Param('themeVersionId') themeVersionId: string,
    @Query('path') path: string,
    @Body() dto: UpdateThemeFileDto,
  ) {
    return this.themesService.updateThemeFile(themeVersionId, path, dto.content);
  }
}


