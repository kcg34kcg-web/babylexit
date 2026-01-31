
import { differenceInHours, differenceInSeconds } from 'date-fns';

// Veritabanından gelen Post tipi (Basitleştirilmiş)
export interface AlgoPost {
  id: string;
  woow_count: number;
  doow_count: number;
  created_at: string; // ISO string
  author_id: string;
  tags?: string[];
  // Simülasyon için ek alanlar
  title?: string; 
}

export class BabylexitRecommender {
  // --- SABİTLER ---
  private static GRAVITY = 1.8;
  private static WEIGHT_WOOW = 10;
  private static WEIGHT_DOOW = -15;
  private static IMMUNITY_WINDOW_HOURS = 2.0;

  // 70-20-10 Deseni: 0=Kişisel, 1=Global, 2=Wildcard
  // P=Personal, G=Global, W=Wildcard
  private static FEED_PATTERN = ['P', 'P', 'P', 'G', 'P', 'P', 'P', 'G', 'P', 'W'];

  /**
   * RankScore Hesaplama (Yerçekimi ve Dokunulmazlık ile)
   */
  public static calculateScore(post: AlgoPost, relevanceMultiplier: number = 1.0): number {
    // 1. Taban Puan Hesabı
    const baseScore = (post.woow_count * this.WEIGHT_WOOW) + (post.doow_count * this.WEIGHT_DOOW);
    
    // 2. Alaka Düzeyi Çarpanı (Kişisel Akış için)
    const adjustedScore = baseScore * relevanceMultiplier;

    // 3. Zaman Mantığı
    const now = new Date();
    const createdAt = new Date(post.created_at);
    const ageHours = Math.max(0, differenceInSeconds(now, createdAt) / 3600);

    // 4. "Yeni Doğan Dokunulmazlığı" (Newborn Immunity)
    // Eğer post 2 saatten yeniyse, zaman durur (0 kabul edilir).
    let effectiveTime = ageHours;
    if (ageHours < this.IMMUNITY_WINDOW_HOURS) {
      effectiveTime = 0;
    }

    // 5. Yerçekimi Çürüme Formülü: Puan / (Zaman + 2)^1.8
    const denominator = Math.pow((effectiveTime + 2), this.GRAVITY);

    return Number((adjustedScore / denominator).toFixed(4));
  }

  /**
   * Hız Hesaplama (Wildcard/Yükselen Yıldızlar için)
   * Formül: Woow / Saat
   */
  public static calculateVelocity(post: AlgoPost): number {
    const now = new Date();
    const createdAt = new Date(post.created_at);
    
    let ageHours = Math.max(0, differenceInSeconds(now, createdAt) / 3600);

    // Sıfıra bölünme hatasını önle (En az 1 dakika yaşinda kabul et)
    if (ageHours <= 0) {
      ageHours = 0.016; 
    }

    return Number((post.woow_count / ageHours).toFixed(4));
  }

  /**
   * Akışları Birleştirme (70-20-10 Kuralı)
   * 3 Listeyi alır ve tek bir sıralı liste döndürür.
   */
  public static mergeFeeds(
    personalList: AlgoPost[], 
    globalList: AlgoPost[], 
    wildcardList: AlgoPost[]
  ): AlgoPost[] {
    const result: AlgoPost[] = [];
    
    // Listelerin kopyasını al (Mutation yapmamak için)
    const lists = {
      'P': [...personalList],
      'G': [...globalList],
      'W': [...wildcardList]
    };

    // Yedekleme sırası (Eğer bir kova boşsa buradan çek)
    const fallbackOrder = ['P', 'G', 'W'] as const;

    let totalItems = personalList.length + globalList.length + wildcardList.length;
    let patternIdx = 0;

    while (result.length < totalItems) {
      // Desenden sıradaki tipi al (P, G veya W)
      const targetType = this.FEED_PATTERN[patternIdx % this.FEED_PATTERN.length] as 'P' | 'G' | 'W';
      let post: AlgoPost | undefined;

      // 1. Hedef listeden çekmeyi dene
      if (lists[targetType].length > 0) {
        post = lists[targetType].shift();
      } 
      // 2. Hedef boşsa yedeklerden çek
      else {
        for (const fbType of fallbackOrder) {
          if (fbType !== targetType && lists[fbType].length > 0) {
            post = lists[fbType].shift();
            break;
          }
        }
      }

      if (post) {
        // ID'si zaten eklenmiş mi kontrol et (Duplicate önleme)
        if (!result.find(p => p.id === post!.id)) {
           result.push(post);
        }
      } else {
        // Hiçbir listede eleman kalmadıysa döngüyü kır
        break;
      }

      patternIdx++;
    }

    return result;
  }
}