'use server'

import { createClient } from '@/utils/supabase/server';
import { redis } from '@/lib/redis'; 
import { BabylexitRecommender } from '@/lib/recommender';

// Spotlight Cache
async function getSpotlightUser() {
  const cacheKey = 'spotlight_user';
  try {
    if (!redis) return null;
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
        return typeof cachedUser === 'string' ? JSON.parse(cachedUser) : cachedUser;
    }
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('profiles')
      .select('id, username:full_name, avatar_url, reputation') // full_name'i username olarak mapledim
      .order('reputation', { ascending: false }) // En yüksek reputasyon spotlight olsun
      .limit(1)
      .single();

    if (user) {
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
    
    let rawPosts: any[] | null = [];
    
    // 1. ÖNCE RPC'Yİ DENE
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('fetch_feed_candidates', { viewer_id: userId });

    // 2. RPC HATALIYSA VEYA BOŞSA YEDEK PLANI (FALLBACK) DEVREYE SOK
    // Bu kısım "posts_with_stats" tablosundan manuel çekim yapar.
    if (rpcError || !rpcData || rpcData.length === 0) {
        console.warn("RPC başarısız oldu veya boş döndü, Fallback çalışıyor...", rpcError);
        
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('posts_with_stats') // Profilde çalışan tablo
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
            
        if (fallbackError) {
             console.error("Fallback de başarısız:", fallbackError);
             return { posts: [], spotlight: null };
        }
        rawPosts = fallbackData;
    } else {
        rawPosts = rpcData;
    }

    if (!rawPosts || rawPosts.length === 0) {
        return { posts: [], spotlight: null };
    }

    // 3. PUANLAMA VE VERİ EŞLEŞTİRME
    const scoredPosts = rawPosts.map((post: any) => ({
        ...post,
        // --- GÜNCELLEME BAŞLANGIÇ ---
        // 1. İsim düzeltmesi: SQL'den gelen veriyi frontend'in beklediği formata çevir
        author_name: post.author_username || post.full_name || "Bilinmeyen Üye",
        
        // 2. Gizlilik ayarını taşı
        is_private: post.is_private,

        // 3. KRİTİK: Reaksiyon Hafızası
        // Veritabanından gelen 'my_reaction' (woow/doow/adil) verisini kesinlikle aktar.
        // Bu satır sayesinde sayfa yenilense bile buton renkli kalır.
        my_reaction: post.my_reaction, 
        // --- GÜNCELLEME BİTİŞ ---

        // Eğer is_following kolonu gelmezse false kabul et
        is_following_author: post.is_following || false, 
        score: BabylexitRecommender.calculateScore({
            ...post,
            is_following_author: post.is_following || false
        })
    }));

    // 4. SIRALAMA
    scoredPosts.sort((a: any, b: any) => b.score - a.score);

    // 5. KATEGORİZASYON DÜZELTMESİ
    // is_following SQL'den gelmeyebilir (Fallback durumunda), bu yüzden
    // personal listesi boş kalırsa global listeyi kullanmalıyız.
    const personal = scoredPosts.filter((p: any) => p.is_following_author || p.user_id === userId || p.author_id === userId);
    const global = scoredPosts.slice(0, 50);
    const wildcard = scoredPosts.filter((p: any) => (p.woow_count || 0) > 2); 

    // 6. BİRLEŞTİRME
    // Eğer hiç kişisel post yoksa, mergeFeeds yerine direkt Global listeyi döndür
    // Bu sayede "Henüz paylaşım yok" hatası almazsın.
    let feed;
    if (personal.length > 0) {
        feed = BabylexitRecommender.mergeFeeds(personal, global, wildcard);
    } else {
        feed = global; // Yeni kullanıcılar veya fallback durumu için
    }
    
    const spotlight = await getSpotlightUser();

    return { 
        posts: feed.slice(0, 50), 
        spotlight 
    };
}