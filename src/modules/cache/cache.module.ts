import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          host: config.get('cache.redis.host'),
          port: config.get('cache.redis.port'),
          password: config.get('cache.redis.password'),
          db: config.get('cache.redis.db'),
          keyPrefix: config.get('cache.prefix'),
          ttl: config.get<number>('cache.ttl')! * 1000,
        }),
        ttl: config.get<number>('cache.ttl')! * 1000,
        max: config.get('cache.max'),
      }),
    }),
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class AppCacheModule {}
