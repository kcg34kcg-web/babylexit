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
      // GÜNCELLEME: Hem ismi hem kullanıcı adını çekiyoruz
      .select('id, full_name, username, avatar_url, reputation')
      .order('reputation', { ascending: false })
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
    
    let rawPosts: any[] = [];
    
    // 1. ÖNCE RPC'Yİ DENE (AYNI KALIYOR)
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('fetch_feed_candidates', { viewer_id: userId });

    // 2. RPC HATALIYSA VEYA BOŞSA YEDEK PLAN (GÜNCELLENDİ)
    if (rpcError || !rpcData || rpcData.length === 0) {
        console.warn("RPC başarısız, Fallback çalışıyor...", rpcError);
        
        // GÜNCELLEME:
        // posts + profiles + post_reactions birleşimi
        // my_reaction verisi burada kesinleşiyor
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!inner (
                    full_name,   
                    username,    
                    avatar_url,
                    reputation
                ),
                my_reaction_data:post_reactions(reaction_type)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (fallbackError) {
             console.error("Fallback hatası:", fallbackError);
             return { posts: [], spotlight: null };
        }

        // FALLBACK VERİ FORMATLAMA
        rawPosts = fallbackData.map((post: any) => ({
            ...post,

            // Profil eşleştirmeleri - GÜNCELLENDİ
            // full_name'i isme, username'i kullanıcı adına atıyoruz
            author_name: post.profiles?.full_name || "İsimsiz Kullanıcı",
            author_username: post.profiles?.username || null, 
            author_avatar: post.profiles?.avatar_url,
            author_reputation: post.profiles?.reputation || 0,

            // Reaksiyon hafızası (KRİTİK)
            my_reaction: post.my_reaction_data?.[0]?.reaction_type || null,

            // Sayaç güvenliği
            woow_count: post.woow_count || 0,
            doow_count: post.doow_count || 0,
            adil_count: post.adil_count || 0,

            // Fallback’te following bilgisi yok
            is_following: false
        }));
    } else {
        rawPosts = rpcData;
    }

    if (!rawPosts || rawPosts.length === 0) {
        return { posts: [], spotlight: null };
    }

    // 3. PUANLAMA VE VERİ EŞLEŞTİRME (AYNI, DOKUNULMADI)
    const scoredPosts = rawPosts.map((post: any) => ({
        ...post,

        // İsim standardizasyonu - GÜNCELLENDİ
        // Öncelik: Kendi adı > Tam adı > Kullanıcı adı > Bilinmeyen
        author_name: post.author_name || post.full_name || post.username || "İsimsiz Üye",
        // Kullanıcı adını (username) ayrıca taşıyoruz ki frontend'de gösterebilelim
        author_username: post.author_username || post.username,

        // Gizlilik
        is_private: post.is_private,

        // Reaksiyon hafızası (RPC veya Fallback fark etmez)
        my_reaction: post.my_reaction,

        // Following bilgisi yoksa false
        is_following_author: post.is_following || false, 

        score: BabylexitRecommender.calculateScore({
            ...post,
            is_following_author: post.is_following || false
        })
    }));

    // 4. SIRALAMA
    scoredPosts.sort((a: any, b: any) => b.score - a.score);

    // 5. KATEGORİLER
    const personal = scoredPosts.filter(
        (p: any) =>
            p.is_following_author ||
            p.user_id === userId ||
            p.author_id === userId
    );

    const global = scoredPosts.slice(0, 50);
    const wildcard = scoredPosts.filter((p: any) => (p.woow_count || 0) > 2); 

    // 6. MERGE
    let feed;
    if (personal.length > 0) {
        feed = BabylexitRecommender.mergeFeeds(personal, global, wildcard);
    } else {
        feed = global;
    }
    
    const spotlight = await getSpotlightUser();

    return { 
        posts: feed.slice(0, 50), 
        spotlight 
    };
}