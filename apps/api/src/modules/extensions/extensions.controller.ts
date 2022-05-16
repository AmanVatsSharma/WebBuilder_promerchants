/**
 * @file extensions.controller.ts
 * @module extensions
 * @description Extensions endpoints (upload/build/install + site blocks feed)
 * @author BharatERP
 * @created 2026-01-24
 */

import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtensionsService } from './extensions.service';
import { UploadExtensionDto } from './dtos/upload-extension.dto';

@Controller('extensions')
export class ExtensionsController {
  constructor(private readonly extensions: ExtensionsService) {}

  @Get()
  list() {
    return this.extensions.listExtensions();
  }

  @Get('versions/:extensionVersionId')
  getVersion(@Param('extensionVersionId') extensionVersionId: string) {
    return this.extensions.getExtensionVersion(extensionVersionId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('bundle'))
  upload(@Body() dto: UploadExtensionDto, @UploadedFile() file: Express.Multer.File) {
    return this.extensions.uploadExtensionBundle(dto, file);
  }

  @Post('versions/:extensionVersionId/build')
  build(@Param('extensionVersionId') extensionVersionId: string) {
    return this.extensions.buildExtensionVersion(extensionVersionId);
  }
}

