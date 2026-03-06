import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  max: parseInt(process.env.CACHE_MAX || '1000', 10),
  prefix: process.env.CACHE_PREFIX || 'mybackend:cache:',
}));
