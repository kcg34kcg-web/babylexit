'use server'

import { createClient } from '@/utils/supabase/server';
import { redis } from '@/lib/redis'; 
import { BabylexitRecommender } from '@/lib/recommender';

// Spotlight Cache (Aynen korundu)
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
    
    // 1. Görüntüleyen kullanıcının (SİZİN) profilini çekiyoruz (Gizlilik Bug'ı Fix için)
    const { data: viewerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, reputation')
        .eq('id', userId)
        .single();

    let rawPosts: any[] = [];
    
    // 2. RPC ile aday postları çek
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('fetch_feed_candidates', { viewer_id: userId });

    // 3. Fallback Mekanizması
    if (rpcError || !rpcData || rpcData.length === 0) {
        const { data: fallbackData } = await supabase
            .from('posts')
            .select(`*, profiles!inner(full_name, username, avatar_url, reputation), my_reaction_data:post_reactions(reaction_type)`)
            .order('created_at', { ascending: false })
            .limit(50);
            
        rawPosts = fallbackData?.map((post: any) => ({
            ...post,
            author_id: post.user_id, // Standartlaştırma
            author_name: post.profiles?.full_name,
            author_username: post.profiles?.username, 
            author_avatar: post.profiles?.avatar_url,
            author_reputation: post.profiles?.reputation,
            my_reaction: post.my_reaction_data?.[0]?.reaction_type
        })) || [];
    } else {
        rawPosts = rpcData;
    }

    if (!rawPosts || rawPosts.length === 0) {
        return { posts: [], spotlight: null };
    }

    // --- KRİTİK ADIM: VERİ ZENGİNLEŞTİRME (ENRICHMENT) ---
    // RPC genellikle 'reputation' veya 'is_private' bilgisini eksik getirir.
    // Postların yazar ID'lerini toplayıp güncel profil verilerini çekiyoruz.
    const authorIds = Array.from(new Set(rawPosts.map((p: any) => p.user_id || p.author_id))).filter(Boolean);
    
    const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, reputation, is_private')
        .in('id', authorIds);

    const authorMap = new Map(authorsData?.map((a: any) => [a.id, a]) || []);

    // 4. PUANLAMA VE VERİ BİRLEŞTİRME
    const scoredPosts = rawPosts.map((post: any) => {
        const authorId = post.user_id || post.author_id;
        const authorProfile = authorMap.get(authorId);
        
        // Post Sahibi Kontrolü (Siz misiniz?)
        const isOwner = userId === authorId;

        // Varsayılan Değerler
        let finalName = "İsimsiz Kullanıcı";
        let finalUsername = null;
        let finalAvatar = null;
        let finalReputation = 0;
        let isPrivate = false;

        // Veri Önceliği: 
        // 1. Eğer post sahibiysek -> ViewerProfile (Kesin doğru veri)
        // 2. Değilsek -> AuthorProfile (Veritabanından taze veri)
        // 3. O da yoksa -> Post içindeki mevcut veri (RPC verisi)
        
        if (isOwner && viewerProfile) {
            finalName = viewerProfile.full_name || "Ben";
            finalUsername = viewerProfile.username;
            finalAvatar = viewerProfile.avatar_url;
            finalReputation = viewerProfile.reputation || 0;
            isPrivate = false; // Kendi postumuzu gizli görmemeliyiz
        } else if (authorProfile) {
            isPrivate = authorProfile.is_private || false;
            
            // Gizlilik Kontrolü: Gizliyse maskele, değilse göster
            if (isPrivate) {
                finalName = "Gizli Üye";
                finalUsername = null; // Gizli üyenin @kullaniciadi görünmez
                finalAvatar = null;   // Avatar görünmez
                finalReputation = 0;  // Puan görünmez (kimliği ele vermesin diye)
            } else {
                finalName = authorProfile.full_name || finalName;
                finalUsername = authorProfile.username;
                finalAvatar = authorProfile.avatar_url;
                finalReputation = authorProfile.reputation || 0;
            }
        } else {
            // Profil bulunamadıysa post verisini kullan
            finalName = post.author_name || post.full_name || finalName;
            finalUsername = post.author_username || post.username;
            finalAvatar = post.author_avatar;
            finalReputation = post.reputation || 0;
        }

        return {
            ...post,
            // ID düzeltmeleri
            user_id: authorId,
            
            // UI Verileri
            author_name: finalName,
            author_username: finalUsername,
            author_avatar: finalAvatar,
            author_reputation: finalReputation, // Rozet için kritik veri artık dolu!
            
            is_private: isPrivate,
            my_reaction: post.my_reaction,
            is_following_author: post.is_following || false, 

            score: BabylexitRecommender.calculateScore({
                ...post,
                is_following_author: post.is_following || false
            })
        };
    });

    // 5. SIRALAMA
    scoredPosts.sort((a: any, b: any) => b.score - a.score);

    // 6. KATEGORİLER VE MERGE
    const personal = scoredPosts.filter((p: any) => p.is_following_author || p.user_id === userId);
    const global = scoredPosts.slice(0, 50);
    const wildcard = scoredPosts.filter((p: any) => (p.woow_count || 0) > 2); 

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