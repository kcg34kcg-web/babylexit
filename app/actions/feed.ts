'use server'

import { createClient } from '@/utils/supabase/server';
import { redis } from '@/lib/redis'; 
import { BabylexitRecommender } from '@/lib/recommender';

// Spotlight Cache (Hata Korumalı)
async function getSpotlightUser() {
  const cacheKey = 'spotlight_user';
  try {
    // Redis yoksa hata vermesin, null dönsün
    if (!redis) return null;

    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
        return typeof cachedUser === 'string' ? JSON.parse(cachedUser) : cachedUser;
    }

    const supabase = await createClient();
    const { data: user } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, last_fame_at')
      .order('last_fame_at', { ascending: true })
      .limit(1)
      .single();

    if (user) {
      await supabase.from('profiles').update({ last_fame_at: new Date().toISOString() }).eq('id', user.id);
      await redis.set(cacheKey, JSON.stringify(user), 'EX', 900);
    }
    return user;
  } catch (error) {
    console.warn("Spotlight (Redis) Warning:", error);
    return null; 
  }
}

export async function fetchFeed(userId: string) {
    const supabase = await createClient();
    
    // 1. SQL'den Ham Veriyi Çek (RPC Fonksiyonu)
    const { data: rawPosts, error } = await supabase
        .rpc('fetch_feed_candidates', { viewer_id: userId })
        .limit(200); 

    if (error) {
        console.error("Feed Fetch Error:", error);
        return { posts: [], spotlight: null };
    }

    if (!rawPosts || rawPosts.length === 0) {
        return { posts: [], spotlight: null };
    }

    // 2. Puanlama (Algoritma Çalışıyor)
    const scoredPosts = rawPosts.map((post: any) => ({
        ...post,
        score: BabylexitRecommender.calculateScore({
            ...post,
            is_following_author: post.is_following 
        })
    }));

    // 3. Sıralama (Yüksek Puan En Üste)
    scoredPosts.sort((a: any, b: any) => b.score - a.score);

    // 4. KATEGORİZASYON (KENDİ POSTUNU DAHİL ETME DÜZELTMESİ)
    // Eski Kod: Sadece takip edilenler vardı.
    // Yeni Kod: "Takip ettiklerim" VEYA "Benim Postlarım"
    const personal = scoredPosts.filter((p: any) => p.is_following || p.author_id === userId);
    
    // İlk 50 postu Global listeye al (Garantili gösterim için genişletildi)
    const global = scoredPosts.slice(0, 50); 
    
    // Popüler olanlar
    const wildcard = scoredPosts.filter((p: any) => p.woow_count > 2); 

    // 5. Birleştirme (Recommender Fermuar Mantığı)
    const feed = BabylexitRecommender.mergeFeeds(personal, global, wildcard);
    
    const spotlight = await getSpotlightUser();

    // Sayfalama için ilk 50'yi döndür
    return { 
        posts: feed.slice(0, 50), 
        spotlight 
    };
}