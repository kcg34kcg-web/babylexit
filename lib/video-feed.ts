import { redis } from './redis';

// Redis Anahtar Ön Ekleri
const FEED_KEY_PREFIX = 'feed:video:';   // Kullanıcının izleme listesi (ZSET)
const SEEN_KEY_PREFIX = 'seen:video:';   // İzlenmiş videolar kümesi (SET)

export const VideoFeedService = {
  
  /**
   * 1. Kullanıcının akışına (Feed) yeni videolar ekler.
   * @param userId - Videoları görecek kullanıcının ID'si
   * @param videos - { videoId, score } formatında video listesi
   * * Mantık: Redis ZSET (Sorted Set) kullanarak videoları 'score' (ilgi puanı)
   * değerine göre sıralarız. En yüksek puanlı video en üstte durur.
   */
  async pushToFeed(userId: string, videos: { videoId: string; score: number }[]) {
    if (!userId || videos.length === 0) return;
    
    // Pipeline kullanarak tüm komutları tek seferde göndeririz (Hız Optimizasyonu)
    const pipeline = redis.pipeline();
    const key = `${FEED_KEY_PREFIX}${userId}`;

    videos.forEach((v) => {
      // ZADD key score member
      pipeline.zadd(key, v.score, v.videoId);
    });

    // Bellek Yönetimi: Feed listesi 500 videoyu geçerse, en düşük puanlıları sil.
    // Bu, raporundaki "Bellek Yönetimi" prensibidir.
    pipeline.zremrangebyrank(key, 0, -501);
    
    await pipeline.exec();
  },

  /**
   * 2. Kullanıcı için sıradaki video ID'lerini getirir.
   * @param offset - Kaçıncı videodan başlayacak (Pagination)
   * @param limit - Kaç tane getirecek (Varsayılan 10)
   */
  async getFeedIds(userId: string, offset: number = 0, limit: number = 10): Promise<string[]> {
    const key = `${FEED_KEY_PREFIX}${userId}`;
    
    // ZREVRANGE: Puanı EN YÜKSEK olandan başlayarak getir.
    // SQL'deki "ORDER BY score DESC" işleminin milisaniye süren versiyonudur.
    return await redis.zrevrange(key, offset, offset + limit - 1);
  },

  /**
   * 3. İzlenen videoyu akıştan kaldırır.
   * Kullanıcı videoyu izleyip geçtikten sonra tekrar önüne çıkmasın.
   */
  async markAsSeen(userId: string, videoId: string) {
    const feedKey = `${FEED_KEY_PREFIX}${userId}`;
    const seenKey = `${SEEN_KEY_PREFIX}${userId}`;

    const pipeline = redis.pipeline();
    
    // Feed listesinden sil
    pipeline.zrem(feedKey, videoId);
    
    // "İzlenenler" listesine ekle (İleride tekrar önermemek için filtre olarak kullanılır)
    pipeline.sadd(seenKey, videoId);
    
    await pipeline.exec();
  },

  /**
   * 4. Kullanıcı daha önce bu videoyu izlemiş mi?
   */
  async hasSeen(userId: string, videoId: string): Promise<boolean> {
    const seenKey = `${SEEN_KEY_PREFIX}${userId}`;
    const result = await redis.sismember(seenKey, videoId);
    return result === 1;
  },

  /**
   * 5. (Opsiyonel) Feed'i tamamen temizle
   * Test ederken veya algoritmayı sıfırlarken kullanışlıdır.
   */
  async clearFeed(userId: string) {
    const key = `${FEED_KEY_PREFIX}${userId}`;
    await redis.del(key);
  }
};