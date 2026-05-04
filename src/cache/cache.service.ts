import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      // If Redis is unavailable, fail silently rather than crashing the app
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) => {
      // Log but never let Redis errors propagate — DB is the source of truth
      console.warn('Redis error (non-fatal):', err.message);
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      // Non-fatal — next read will go to DB
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // Non-fatal
    }
  }

  //  invalidate all keys matching a prefix ──
  // Used after writes (POST /api/profiles, CSV import) to clear stale
  // cached query results. Uses SCAN instead of KEYS to avoid blocking
  // Redis on large keyspaces.
  async invalidatePattern(prefix: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Non-fatal
    }
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => {});
  }
}