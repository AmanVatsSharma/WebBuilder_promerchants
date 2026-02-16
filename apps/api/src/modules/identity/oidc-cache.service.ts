/**
 * @file oidc-cache.service.ts
 * @module identity
 * @description OIDC metadata cache with optional Redis-backed persistence
 * @author BharatERP
 * @created 2026-02-16
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { buildRedisConnection } from '../../shared/queue/redis.config';

type CacheEnvelope = {
  value: unknown;
  expiresAt: number;
};

function parseCacheBackend() {
  const raw = String(process.env.AUTH_OIDC_CACHE_BACKEND || 'memory').trim().toLowerCase();
  return raw === 'redis' ? 'redis' : 'memory';
}

function normalizeTtlMs(ttlMs: number) {
  if (!Number.isFinite(ttlMs)) return 300000;
  return Math.max(5000, Math.min(24 * 60 * 60 * 1000, Math.floor(ttlMs)));
}

@Injectable()
export class OidcCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(OidcCacheService.name);
  private readonly memory = new Map<string, CacheEnvelope>();
  private redisClient: Redis | null = null;
  private redisReady = false;
  private redisDisabled = false;

  async onModuleDestroy() {
    if (!this.redisClient) return;
    try {
      await this.redisClient.quit();
    } catch {
      await this.redisClient.disconnect();
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const redisValue = await this.getFromRedis<T>(key);
    if (redisValue !== null) return redisValue;
    return this.getFromMemory<T>(key);
  }

  async set(key: string, value: unknown, ttlMs: number) {
    const normalizedTtl = normalizeTtlMs(ttlMs);
    this.setInMemory(key, value, normalizedTtl);
    await this.setInRedis(key, value, normalizedTtl);
  }

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setInMemory(key: string, value: unknown, ttlMs: number) {
    this.memory.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    const client = await this.getRedisClient();
    if (!client) return null;
    try {
      const payload = await client.get(key);
      if (!payload) return null;
      return JSON.parse(payload) as T;
    } catch (error: any) {
      this.logger.warn(`redis get failed key=${key} reason=${error?.message || error}`);
      return null;
    }
  }

  private async setInRedis(key: string, value: unknown, ttlMs: number) {
    const client = await this.getRedisClient();
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (error: any) {
      this.logger.warn(`redis set failed key=${key} reason=${error?.message || error}`);
    }
  }

  private async getRedisClient() {
    if (parseCacheBackend() !== 'redis') return null;
    if (this.redisDisabled) return null;
    if (!this.redisClient) {
      const connection = buildRedisConnection() as any;
      this.redisClient = new Redis({
        ...connection,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.redisClient.on('error', (error) => {
        this.logger.warn(`redis error reason=${error?.message || error}`);
      });
    }
    if (this.redisReady) return this.redisClient;
    try {
      await this.redisClient.connect();
      this.redisReady = true;
      this.logger.log('OIDC cache redis backend connected');
      return this.redisClient;
    } catch (error: any) {
      this.redisDisabled = true;
      this.logger.warn(`OIDC cache redis disabled reason=${error?.message || error}`);
      return null;
    }
  }
}

