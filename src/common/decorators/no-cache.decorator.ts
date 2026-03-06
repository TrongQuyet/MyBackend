import { SetMetadata } from '@nestjs/common';
import { NO_CACHE_KEY } from '../../modules/cache/cache.constants';

export const NoCache = () => SetMetadata(NO_CACHE_KEY, true);
