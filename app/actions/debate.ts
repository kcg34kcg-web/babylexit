'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDailyDebate() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Bugünün tartışmasını çek
  let { data: debate, error } = await supabase
    .from('daily_debates')
    .select('*')
    .eq('date', today)
    .single();

  // Eğer bugünün kaydı yoksa (veya saat farkından dolayı), en son eklenen kaydı getir (Fallback)
  if (!debate) {
    const { data: latest } = await supabase
      .from('daily_debates')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    debate = latest;
  }

  if (!debate) return null;

  // 2. Oyları Say
  const { count: countA } = await supabase
    .from('debate_votes')
    .select('*', { count: 'exact', head: true })
    .eq('debate_id', debate.id)
    .eq('choice', 'A');

  const { count: countB } = await supabase
    .from('debate_votes')
    .select('*', { count: 'exact', head: true })
    .eq('debate_id', debate.id)
    .eq('choice', 'B');

  // 3. Kullanıcının oy verip vermediğini kontrol et
  const { data: { user } } = await supabase.auth.getUser();
  let userVote = null;

  if (user) {
    const { data: vote } = await supabase
      .from('debate_votes')
      .select('choice')
      .eq('debate_id', debate.id)
      .eq('user_id', user.id)
      .single();
    userVote = vote?.choice;
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

export async function voteDailyDebate(debateId: string, choice: 'A' | 'B') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız." };

  const { error } = await supabase
    .from('debate_votes')
    .insert({
      debate_id: debateId,
      user_id: user.id,
      choice: choice
    });

  if (error) {
    if (error.code === '23505') return { error: "Zaten oy kullandınız." };
    return { error: "Oy verilemedi." };
  }

  revalidatePath('/social');
  return { success: true };
}