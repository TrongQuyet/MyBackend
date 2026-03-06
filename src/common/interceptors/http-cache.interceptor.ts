import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../modules/cache/cache.service';
import {
  NO_CACHE_KEY,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from '../../modules/cache/cache.constants';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    if (request.method !== 'GET') {
      return next.handle();
    }

    const noCache = this.reflector.getAllAndOverride<boolean>(NO_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (noCache) {
      return next.handle();
    }

    const customKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    const cacheKey = customKey || this.buildCacheKey(request);

    const customTtl = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    const cached = await this.cacheService.get(cacheKey);
    if (cached !== undefined && cached !== null) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return of(cached);
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);
    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.cacheService.set(cacheKey, response, customTtl);
        } catch (err) {
          this.logger.warn(`Failed to cache: ${cacheKey}`);
        }
      }),
    );
  }

  private buildCacheKey(request: any): string {
    const userId = request.user?.id || 'anonymous';
    const url = request.url;
    return `http:${userId}:${url}`;
  }
}
