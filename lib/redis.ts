import Redis from 'ioredis';

// TypeScript için global değişken tanımı
const globalForRedis = global as unknown as { redis: Redis };

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;

  // 1. Canlı Redis Bağlantısı
  if (redisUrl) {
    console.log('🔌 Connecting to Redis...');
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  // 2. Geliştirme Ortamı için Mock (Sanal) Client
  // Eğer .env dosyasında REDIS_URL yoksa patlamaması için
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ WARNING: REDIS_URL is not defined. Using Mock Redis Client.');
    
    // Basit bir Mock Client
    return new Proxy({}, {
      get: (_target, prop) => {
        if (prop === 'get') return async () => null;
        if (prop === 'set') return async () => 'OK';
        if (prop === 'del') return async () => 0;
        if (prop === 'on') return () => {};
        if (prop === 'quit') return async () => 'OK';
        return async () => null;
      }
    }) as unknown as Redis;
  }

  throw new Error('REDIS_URL is not defined');
};

// --- SINGLETON PATTERN ---
// Varsa global'dekini kullan, yoksa yeni oluştur.
export const redis = globalForRedis.redis || getRedisClient();

// Eğer production değilse, oluşturulan bağlantıyı global'e kaydet.
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}