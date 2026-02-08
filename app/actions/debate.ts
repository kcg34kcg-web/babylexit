'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. GÜNÜN TARTIŞMASINI ÇEK
export async function getDailyDebate() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // ✅ Tablo adı güncellendi: social_daily_debates
  const { data: debate, error } = await supabase
    .from('social_daily_debates')
    .select('*')
    .eq('date', today)
    .single();

  if (error || !debate) return null;

  // ✅ Tablo adı güncellendi: social_debate_votes
  const { count: countA } = await supabase
    .from('social_debate_votes')
    .select('*', { count: 'exact', head: true })
    .eq('debate_id', debate.id)
    .eq('choice', 'A');

  const { count: countB } = await supabase
    .from('social_debate_votes')
    .select('*', { count: 'exact', head: true })
    .eq('debate_id', debate.id)
    .eq('choice', 'B');

  // Kullanıcı oyu kontrolü
  const { data: { user } } = await supabase.auth.getUser();
  let userVote = null;

  if (user) {
    const { data: vote } = await supabase
      .from('social_debate_votes')
      .select('choice')
      .eq('debate_id', debate.id)
      .eq('user_id', user.id)
      .single();
    if (vote) userVote = vote.choice;
  }

  return {
    ...debate,
    stats: {
      a: countA || 0,
      b: countB || 0,
      total: (countA || 0) + (countB || 0)
    },
    userVote
  };
}

// 2. OY VERME İŞLEMİ
export async function voteDailyDebate(debateId: string, choice: 'A' | 'B') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Oy vermek için giriş yapmalısınız." };

  // ✅ Tablo adı güncellendi: social_debate_votes
  const { error } = await supabase
    .from('social_debate_votes')
    .insert({ debate_id: debateId, user_id: user.id, choice });

  if (error) {
    if (error.code === '23505') return { error: "Zaten oy kullandınız." };
    return { error: "Oy verilemedi." };
  }

  revalidatePath('/social');
  return { success: true };
}

// 3. YORUM GÖNDERME İŞLEMİ
export async function postDebateComment(debateId: string, content: string, side: 'A' | 'B') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Yorum yapmak için giriş yapmalısınız." };

  // ✅ Tablo adı güncellendi: social_debate_comments
  const { error } = await supabase
    .from('social_debate_comments')
    .insert({
      debate_id: debateId,
      user_id: user.id,
      content,
      side
    });

  if (error) return { error: "Yorum gönderilemedi." };
  
  revalidatePath('/social');
  return { success: true };
}

// 4. YORUMLARI ÇEKME
export async function getDebateComments(debateId: string) {
  const supabase = await createClient();

  // ✅ Tablo adı güncellendi: social_debate_comments
  const { data: comments } = await supabase
    .from('social_debate_comments')
    .select(`
      id,
      content,
      side,
      created_at,
      likes,
      profiles (full_name, username, avatar_url)
    `)
    .eq('debate_id', debateId)
    .order('created_at', { ascending: false });

  return comments || [];
}