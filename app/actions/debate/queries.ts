'use server';

import { createClient } from "@/utils/supabase/server";
import { unstable_noStore as noStore } from 'next/cache';
import { Debate } from "./types";

// --- 1. GÜNÜN TARTIŞMASINI GETİR ---
export async function getDailyDebate(): Promise<Debate | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    // 1. Önce bugünün özel tartışması var mı bakalım
    let { data: rawDebate, error } = await supabase
        .from('social_debates')
        .select(`*, profiles:created_by (full_name, avatar_url)`)
        .eq('is_daily_featured', true)
        .eq('featured_date', today)
        .maybeSingle();

    if (error) console.error("Daily Fetch Error:", error);

    // 2. Fallback: En popüler olanı getir
    if (!rawDebate) {
         const { data: popular } = await supabase
            .from('social_debates')
            .select('*, profiles:created_by (full_name, avatar_url)')
            .eq('is_active', true)
            .order('vote_count_a', { ascending: false }) 
            .limit(1)
            .maybeSingle();
         rawDebate = popular;
    }

    if (!rawDebate) return null;

    // 3. Kullanıcı oy durumu
    let userVote: 'A' | 'B' | null = null;
    let changeCount = 0;

    if (user) {
        const { data: voteData } = await supabase
            .from('social_debate_votes')
            .select('choice, change_count')
            .eq('debate_id', rawDebate.id)
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (voteData) {
            userVote = voteData.choice as 'A' | 'B';
            changeCount = voteData.change_count || 0;
        }
    }

    return {
        id: rawDebate.id,
        title: rawDebate.title,
        description: rawDebate.description,
        created_at: rawDebate.created_at,
        created_by: rawDebate.profiles,
        stats: {
            a: rawDebate.vote_count_a || 0,
            b: rawDebate.vote_count_b || 0,
            total: (rawDebate.vote_count_a || 0) + (rawDebate.vote_count_b || 0)
        },
        userVote: userVote,
        changeCount: changeCount,
        is_active: rawDebate.is_active,
        is_daily: true
    };
}

// --- 2. MÜNAZARA AKIŞI (Feed) ---
export async function getDebateFeed(page = 0, limit = 10, search?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('get_debate_feed', {
      p_user_id: user?.id || null,
      p_limit: limit,
      p_offset: page * limit,
      p_search: search || null
  });

  if (error || !data) {
      console.error("Feed Error:", error);
      return [];
  }

  return data.map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      created_at: d.created_at,
      created_by: d.created_by_data,
      stats: { a: d.stats_a, b: d.stats_b, total: d.stats_a + d.stats_b },
      userVote: d.user_vote,
      changeCount: d.user_change_count,
      is_active: d.is_active
  }));
}

// --- 3. YORUMLARI GETİR ---
export async function getDebateComments(debateId: string) {
    noStore();
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('social_debate_comments')
        .select(`
            id, content, side, persuasion_count, created_at,
            profiles:user_id ( id, full_name, avatar_url, job_title )
        `)
        .eq('debate_id', debateId)
        .order('persuasion_count', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Comments Fetch Error:", error.message);
        return [];
    }
    return data;
}

// --- 4. AI BAŞLIK ÖNERİLERİ ---
export async function generateSmartTitles(topic: string) {
    if (!topic || topic.length < 3) return [];
    return [
        `Yapay Zeka: ${topic} Hakkında Ne Düşünüyor?`,
        `${topic}: Toplumsal Etkileri Neler?`,
        `${topic} Yasaklanmalı mı?`,
        `Gelecekte ${topic} Nasıl Değişecek?`
    ];
}