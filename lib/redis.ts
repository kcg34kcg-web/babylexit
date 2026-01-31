import Redis from 'ioredis';

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    console.log('🔌 Connecting to Redis...');
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ WARNING: REDIS_URL is not defined. Using Mock Redis Client.');
    
    // Mock Client to prevent crashes
    return new Proxy({}, {
      get: (_target, prop) => {
        if (prop === 'get') return async () => null;
        if (prop === 'set') return async () => 'OK';
        if (prop === 'del') return async () => 0;
        if (prop === 'on') return () => {};
        return async () => null;
      }
    }) as unknown as Redis;
  }

  throw new Error('REDIS_URL is not defined');
};

export const redis = getRedisClient();