import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl ? ttl * 1000 : undefined);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async delByPattern(pattern: string): Promise<number> {
    const stores = (this.cacheManager as any).stores;
    const store = stores?.[0];
    const client = store?.opts?.store?.client || store?.client;

    if (!client?.scan) {
      this.logger.warn('Redis client not available for pattern deletion');
      return 0;
    }

    const prefix: string = client.options?.keyPrefix || '';
    const fullPattern = `${prefix}${pattern}`;

    let deleted = 0;
    let cursor = '0';

    do {
      const [nextCursor, keys]: [string, string[]] = await client.scan(
        cursor,
        'MATCH',
        fullPattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        const unprefixedKeys = keys.map((k: string) =>
          k.startsWith(prefix) ? k.slice(prefix.length) : k,
        );
        await client.del(...unprefixedKeys);
        deleted += keys.length;
      }
    } while (cursor !== '0');

    this.logger.debug(`Deleted ${deleted} keys matching pattern: ${pattern}`);
    return deleted;
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
}
