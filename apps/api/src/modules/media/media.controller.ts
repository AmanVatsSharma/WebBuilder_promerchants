/**
 * File: apps/api/src/modules/media/media.controller.ts
 * Module: media
 * Purpose: Media endpoints (upload/list/serve)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 */

import { Controller, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import mime from 'mime-types';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('sites/:siteId/upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('siteId') siteId: string, @UploadedFile() file: Express.Multer.File) {
    return this.media.upload(siteId, file);
  }

  @Get('sites/:siteId/list')
  list(@Param('siteId') siteId: string) {
    return this.media.list(siteId);
  }

  @Get('sites/:siteId/file')
  async file(@Param('siteId') siteId: string, @Query('key') key: string, @Res({ passthrough: true }) res: Response) {
    const { fullKey, buf } = await this.media.read(siteId, key);
    const contentType = (mime.lookup(fullKey) || 'application/octet-stream') as string;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return buf;
  }
}

