import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../modules/cache/cache.service';
import { CACHE_INVALIDATE_METADATA } from '../../modules/cache/cache.constants';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const patterns = this.reflector.get<string[]>(
      CACHE_INVALIDATE_METADATA,
      context.getHandler(),
    );

    if (!patterns || patterns.length === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        const request = context.switchToHttp().getRequest();
        for (const pattern of patterns) {
          const resolved = this.resolvePattern(pattern, request);
          await this.cacheService.delByPattern(resolved);
          this.logger.debug(`Cache invalidated: ${resolved}`);
        }
      }),
    );
  }

  private resolvePattern(pattern: string, request: any): string {
    let resolved = pattern;
    if (request.params) {
      for (const [key, value] of Object.entries(request.params)) {
        resolved = resolved.replace(`:${key}`, value as string);
      }
    }
    return resolved;
  }
}
