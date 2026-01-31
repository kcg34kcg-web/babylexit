'use server'

import { createClient } from '@/utils/supabase/server';
// @ts-ignore veya types hatası alıyorsanız import redis from ... deneyin
import { redis } from '@/lib/redis'; 
import { BabylexitRecommender } from '@/lib/recommender';

// ... (PostCandidate interface aynen kalıyor) ...

// 1. SPOTLIGHT MEKANİZMASI (Düzeltildi)
async function getSpotlightUser() {
  const cacheKey = 'spotlight_user';

  try {
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
      await supabase
        .from('profiles')
        .update({ last_fame_at: new Date().toISOString() })
        .eq('id', user.id);

      // DÜZELTME BURADA: ioredis syntax'ı ('EX', saniye)
      await redis.set(cacheKey, JSON.stringify(user), 'EX', 900);
    }

    return user;

  } catch (error) {
    console.error("Spotlight Error:", error);
    return null; 
  }
}

// ... (fetchFeed fonksiyonu aynen kalıyor) ...
export async function fetchFeed(userId: string) {
    // ... (önceki kodun aynısı)
    const supabase = await createClient();
    const { data: rawPosts, error } = await supabase
        .rpc('fetch_feed_candidates', { viewer_id: userId })
        .limit(200); 

    if (error || !rawPosts) return { posts: [], spotlight: null };

    const scoredPosts = rawPosts.map((post: any) => ({
        ...post,
        score: BabylexitRecommender.calculateScore({
            ...post,
            is_following_author: post.is_following 
        })
    }));

    scoredPosts.sort((a: any, b: any) => b.score - a.score);

    const personal = scoredPosts.filter((p: any) => p.is_following);
    const global = scoredPosts.slice(0, 20); 
    const wildcard = scoredPosts.filter((p: any) => p.woow_count > 5 && p.author_followers < 100);

    const feed = BabylexitRecommender.mergeFeeds(personal, global, wildcard);
    const spotlight = await getSpotlightUser();

    return { 
        posts: feed.slice(0, 50), 
        spotlight 
    };
}