import { Redis } from 'ioredis';

const redisClient = () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not defined');
  }
  return new Redis(process.env.REDIS_URL);
};

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis = globalForRedis.redis ?? redisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;