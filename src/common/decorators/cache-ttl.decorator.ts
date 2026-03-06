import { SetMetadata } from '@nestjs/common';
import { CACHE_TTL_METADATA } from '../../modules/cache/cache.constants';

export const CacheTTL = (seconds: number) =>
  SetMetadata(CACHE_TTL_METADATA, seconds);
