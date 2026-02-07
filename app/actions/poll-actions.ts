'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Casts a vote, switches a vote, or retracts a vote using the secure DB function.
 */
export async function castPollVote(pollId: string, optionId: string) {
  const supabase = await createClient();

  // 1. Get Current User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to vote." };
  }

  // 2. Call the Atomic Database Function
  // 'vote_poll' handles all race conditions and logic (switch/retract/vote)
  const { data: status, error } = await supabase.rpc('vote_poll', {
    p_poll_id: pollId,
    p_option_id: optionId
  });

  // 3. Handle Database Errors
  if (error) {
    console.error("Poll Vote Error:", error);
    if (error.message.includes('Poll is closed')) return { error: "This poll has ended." };
    if (error.message.includes('Poll not found')) return { error: "Poll not found." };
    return { error: "Could not cast vote. Please try again." };
  }

  // 4. Revalidate to update UI
  // Note: Adjust these paths if your polls appear on other pages
  revalidatePath('/'); 
  revalidatePath('/questions'); 
  
  return { success: true, status }; // status = 'voted' | 'switched' | 'retracted'
}

/**
 * Belirli bir ankete ve seçeneğe oy veren kullanıcıları getirir.
 * Gizlilik ve Performans önceliklidir.
 */
export async function getPollVoters(pollId: string, optionId: string) {
  const supabase = await createClient();

  // 1. Önce anketin gizlilik durumunu kontrol et
  const { data: poll } = await supabase
    .from('polls')
    .select('is_anonymous')
    .eq('id', pollId)
    .single();

  if (!poll) return { error: "Anket bulunamadı." };
  if (poll.is_anonymous) return { error: "Bu anket anonimdir, oy verenler görüntülenemez." };

  // 2. Oy verenleri profilleriyle birlikte çek (Limit: 50)
  // İleride "Load More" eklemek istersen .range() kullanabilirsin.
  const { data: voters, error } = await supabase
    .from('poll_votes')
    .select(`
      user_id,
      voted_at,
      profiles (
        id,
        username,
        full_name,
        avatar_url,
        reputation
      )
    `)
    .eq('poll_id', pollId)
    .eq('option_id', optionId)
    .order('voted_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error("Voters Fetch Error:", error);
    return { error: "Oy verenler alınamadı." };
  }

  // Veriyi temizle ve döndür
  // Supabase'den dönen veri yapısını UI'ın beklediği düz profile çeviriyoruz
  const formattedVoters = voters.map((v: any) => ({
    user_id: v.user_id,
    voted_at: v.voted_at,
    ...v.profiles // username, full_name, avatar_url, reputation buraya yayılır
  }));

  return { success: true, data: formattedVoters };
}