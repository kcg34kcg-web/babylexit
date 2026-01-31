import { Queue, Worker, Job } from 'bullmq'; // Job tipini ekledik
import { BabylexitRecommender } from './recommendationAlgorithm';
import { createClient } from '@/utils/supabase/server';
import { redis } from '@/lib/redis'; // Daha önce oluşturduğumuz redis bağlantısını kullanıyoruz

// Kuyruğa gönderilecek verinin yapısını tanımlayalım
interface FeedUpdateData {
  postId: string;
}

// 1. Kuyruğu Tanımla
// 'connection' olarak lib/redis'teki hazır bağlantıyı kullanmak daha sağlıklıdır
export const feedQueue = new Queue<FeedUpdateData>('feed-updates', { 
  connection: redis as any 
});

// 2. Worker: Arka planda çalışacak olan mantık
// 'job: Job<FeedUpdateData>' diyerek any hatasını çözüyoruz
const worker = new Worker(
  'feed-updates', 
  async (job: Job<FeedUpdateData>) => {
    const { postId } = job.data;
    
    try {
      // Supabase'den güncel veriyi çek
      const supabase = await createClient();
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error || !post) {
        console.error(`Post bulunamadı: ${postId}`, error);
        return;
      }

      // Algoritmayı çalıştır
      const newScore = BabylexitRecommender.calculateScore(post);
      
      // Redis ZSET'e ekle/güncelle
      // redis.zadd kullanarak sıralı listeyi güncelliyoruz
      if (redis) {
        await redis.zadd('babylexit:global_feed', newScore, postId);
      }
      
      console.log(`✅ Post ${postId} güncellendi. Yeni skor: ${newScore}`);
    } catch (err) {
      console.error(`Worker işlem hatası (ID: ${postId}):`, err);
    }
  }, 
  { connection: redis as any }
);

// Worker hatalarını dinlemek için (Opsiyonel ama önerilir)
worker.on('failed', (job, err) => {
  console.error(`${job?.id} nolu iş başarısız oldu:`, err);
});

export default worker;