import { createClient } from '@/utils/supabase/client';

interface PostCandidate {
  id: string;
  author_id: string;
  created_at: string;
  woow_count: number;
  doow_count: number;
  is_following_author: boolean;
}

export class BabylexitRecommender {
  static calculateScore(post: PostCandidate): number {
    const now = new Date();
    const created = new Date(post.created_at);
    
    // Saate çevir (0'a bölünmeyi önlemek için minimum 0.1)
    const ageHours = Math.max(0.1, (now.getTime() - created.getTime()) / (1000 * 60 * 60));

    // 1. TABAN PUAN (DÜZELTİLDİ)
    // Yeni postlar 0 beğeni ile başlasa bile, onlara "50" başlangıç puanı veriyoruz.
    // Böylece 0 puanla elenmezler.
    const STARTER_BONUS = 50; 
    let baseScore = STARTER_BONUS + (post.woow_count * 10) - (post.doow_count * 15);

    // Eğer çok fazla dislike aldıysa (puan negatife düştüyse), en az 1 puan ver ki hata vermesin
    if (baseScore <= 0) baseScore = 1;

    // 2. YENİ DOĞAN DOKUNULMAZLIĞI (Cold Start Fix)
    // İlk 4 saat boyunca zaman, puanı çok az eritir.
    const timeFactor = ageHours < 4 ? 0.5 : ageHours;

    // 3. GRAVİTE (Çekim Gücü)
    // Takip ettiklerin (0.8) daha yavaş düşer, yabancılar (1.8) daha hızlı düşer.
    // Eğer is_following_author undefined gelirse (SQL hatası vs.), varsayılan 1.5 al.
    const gravity = post.is_following_author ? 0.8 : 1.5;

    // 4. FORMÜL
    // (timeFactor + 2) -> 0 hatasını önler.
    const finalScore = baseScore / Math.pow(timeFactor + 2, gravity);

    return finalScore;
  }

  static mergeFeeds(
    personal: PostCandidate[],
    global: PostCandidate[],
    wildcard: PostCandidate[]
  ): PostCandidate[] {
    const result: PostCandidate[] = [];
    
    // Döngü pointerları
    let pIdx = 0, gIdx = 0, wIdx = 0;

    // "Fermuar" Mantığı: Listeleri karıştır
    // 10'luk paket: 7 Kişisel + 2 Global + 1 Sürpriz
    const totalLen = personal.length + global.length + wildcard.length;
    
    // Sonsuz döngüyü önlemek için güvenlik sayacı
    let safety = 0;
    
    while (result.length < totalLen && safety < 1000) {
      safety++;

      // 1. Kişisel Akıştan 7 tane al (Varsa)
      for (let i = 0; i < 7; i++) {
        if (personal[pIdx]) {
            if (!result.find(r => r.id === personal[pIdx].id)) result.push(personal[pIdx]);
            pIdx++;
        }
      }

      // 2. Global Akıştan 2 tane al
      for (let i = 0; i < 2; i++) {
        if (global[gIdx]) {
            if (!result.find(r => r.id === global[gIdx].id)) result.push(global[gIdx]);
            gIdx++;
        }
      }

      // 3. Sürprizden 1 tane al
      for (let i = 0; i < 1; i++) {
        if (wildcard[wIdx]) {
            if (!result.find(r => r.id === wildcard[wIdx].id)) result.push(wildcard[wIdx]);
            wIdx++;
        }
      }

      // Eğer hepsi bittiyse çık
      if (!personal[pIdx] && !global[gIdx] && !wildcard[wIdx]) break;
    }

    return result;
  }
}