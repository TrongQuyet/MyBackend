import { SetMetadata } from '@nestjs/common';
import { CACHE_INVALIDATE_METADATA } from '../../modules/cache/cache.constants';

export const CacheInvalidate = (...patterns: string[]) =>
  SetMetadata(CACHE_INVALIDATE_METADATA, patterns);
