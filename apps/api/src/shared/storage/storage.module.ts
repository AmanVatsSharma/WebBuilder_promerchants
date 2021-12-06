/**
 * File: apps/api/src/shared/storage/storage.module.ts
 * Module: shared/storage
 * Purpose: Provides StorageProvider implementation via DI
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Currently uses LocalFsStorageProvider. Later switch based on env to S3 provider.
 */

import { Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage.constants';
import { LocalFsStorageProvider } from './local-fs.storage';

@Module({
  providers: [
    LocalFsStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useExisting: LocalFsStorageProvider,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}


