'use server'

import { createClient } from '@/utils/supabase/server';
import { redis } from '@/lib/redis'; 
import { BabylexitRecommender } from '@/lib/recommender';
import { differenceInHours, isPast, isToday, parseISO } from 'date-fns'; // Added for Event Logic

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
    
    // 1. Görüntüleyen kullanıcının (SİZİN) profilini çekiyoruz
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
        // Fallback sorgusuna comments(count) eklendi
        const { data: fallbackData } = await supabase
            .from('posts')
            .select(`*, profiles!inner(full_name, username, avatar_url, reputation), my_reaction_data:post_reactions(reaction_type)`)
            .order('created_at', { ascending: false })
            .limit(50);
            
        rawPosts = fallbackData?.map((post: any) => ({
            ...post,
            author_id: post.user_id, 
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

    // --- FIX: COMMENT COUNT FETCHING ---
    const postIds = rawPosts.map((p: any) => p.id);
    
    const { data: countData } = await supabase
        .from('posts')
        .select('id, comments(count)')
        .in('id', postIds);

    const commentCountMap = new Map();
    if (countData) {
        countData.forEach((item: any) => {
            const count = item.comments?.[0]?.count || 0;
            commentCountMap.set(item.id, count);
        });
    }

    // --- VERİ ZENGİNLEŞTİRME ---
    const authorIds = Array.from(new Set(rawPosts.map((p: any) => p.author_id || p.user_id))).filter(Boolean);
    
    const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, reputation, is_private')
        .in('id', authorIds);

    const authorMap = new Map(authorsData?.map((a: any) => [a.id, a]) || []);

    // 4. PUANLAMA VE VERİ BİRLEŞTİRME (ALGORİTMA BURADA GÜNCELLENDİ)
    const scoredPosts = rawPosts.map((post: any) => {
        const authorId = post.author_id || post.user_id;
        const authorProfile = authorMap.get(authorId);
        
        const commentCount = commentCountMap.get(post.id) ?? post.comment_count ?? 0;
        const isOwner = userId === authorId;

        let finalName = "İsimsiz Kullanıcı";
        let finalUsername = null;
        let finalAvatar = null;
        let finalReputation = 0;
        let isPrivate = false;

        if (isOwner && viewerProfile) {
            finalName = viewerProfile.full_name || post.author_name || "Ben";
            finalUsername = viewerProfile.username || post.author_username || post.username; 
            finalAvatar = viewerProfile.avatar_url || post.author_avatar;
            finalReputation = (viewerProfile.reputation !== undefined && viewerProfile.reputation !== null) 
                ? viewerProfile.reputation 
                : (post.author_reputation || 0);
            isPrivate = false; 
        } else if (authorProfile) {
            isPrivate = authorProfile.is_private || false;
            if (isPrivate) {
                finalName = "Gizli Üye";
                finalUsername = null; 
                finalAvatar = null;   
                finalReputation = 0;  
            } else {
                finalName = authorProfile.full_name || finalName;
                finalUsername = authorProfile.username;
                finalAvatar = authorProfile.avatar_url;
                finalReputation = authorProfile.reputation || 0;
            }
        } else {
            finalName = post.author_name || post.full_name || finalName;
            finalUsername = post.author_username || post.username;
            finalAvatar = post.author_avatar;
            finalReputation = post.reputation || 0;
        }

        // --- HYPE & URGENCY ALGORITHM (PHASE 3) ---
        let finalScore = 0;
        const baseScore = BabylexitRecommender.calculateScore({
            ...post,
            comment_count: commentCount,
            is_following_author: post.is_following || false
        });

        if (post.is_event && post.event_date) {
            const eventDate = parseISO(post.event_date);
            const now = new Date();
            const hypeScore = ((post.woow_count || 0) * 2) + (commentCount * 3);
            
            // 1. URGENCY CHECK
            if (isToday(eventDate)) {
                // BUGÜNSE: Massive Boost (5x) + Hype
                finalScore = (baseScore + hypeScore) * 5.0;
            } else if (isPast(eventDate)) {
                // GEÇMİŞSE: Burial Protocol (0.05x) - Feed'in dibine
                finalScore = (baseScore + hypeScore) * 0.05;
            } else {
                // GELECEKTE:
                const hoursUntil = differenceInHours(eventDate, now);
                
                if (hoursUntil <= 24) {
                    // YARINSA: High Priority (3x)
                    finalScore = (baseScore + hypeScore) * 3.0;
                } else if (hoursUntil <= 72) {
                    // BU HAFTAYSA: Medium Priority (1.5x)
                    finalScore = (baseScore + hypeScore) * 1.5;
                } else {
                    // DAHA UZAKSA: Standard Score
                    finalScore = baseScore + hypeScore;
                }
            }
        } else {
            // Standart Post
            finalScore = baseScore;
        }

        return {
            ...post,
            user_id: authorId,
            author_name: finalName,
            author_username: finalUsername,
            author_avatar: finalAvatar,
            author_reputation: finalReputation,
            is_private: isPrivate,
            my_reaction: post.my_reaction,
            
            woow_count: post.woow_count || 0,
            doow_count: post.doow_count || 0,
            adil_count: post.adil_count || 0,
            comment_count: commentCount,

            is_following_author: post.is_following || false, 
            score: finalScore // Updated Score
        };
    });

    // 5. SIRALAMA (Yüksek skor en üstte)
    scoredPosts.sort((a: any, b: any) => b.score - a.score);

    // 6. KATEGORİLER VE MERGE
    // Kişisel feed artık event puanlarını da içeriyor
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