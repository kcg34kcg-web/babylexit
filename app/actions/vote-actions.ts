'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redis } from "@/lib/redis";
import { addReputation } from "./reputation"; // <--- 1. YENİ: İtibar sistemi eklendi

/**
 * Bir cevaba oy verme işlemini (Upvote/Downvote) gerçekleştirir.
 */
export async function voteAction(answerId: string, voteType: 1 | -1) {
  const supabase = await createClient();

  // 1. Oturum kontrolü
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "Oylamak için giriş yapmalısınız." };
  }

  if (!answerId) {
    return { error: "Geçersiz cevap ID'si." };
  }

  // 2. Veritabanında oylama işlemini yap (RPC)
  const { error: rpcError } = await supabase.rpc('vote_answer', {
    p_answer_id: answerId,
    p_user_id: user.id,
    p_vote_type: voteType
  });

  if (rpcError) {
    console.error("RPC Oylama Hatası:", rpcError);
    return { error: "Oylama işlemi başarısız oldu." };
  }

  // 3. VERİ GÜNCELLEME (REDIS + REPUTATION)
  try {
    // Güncel cevap verisini çekiyoruz (Skor ve Yazar ID'si lazım)
    // Not: 'user_id' cevabı yazan kişinin ID'sidir. Tablonda 'author_id' ise burayı düzelt.
    const { data: answer } = await supabase
      .from('answers')
      .select('upvotes, downvotes, created_at, user_id') 
      .eq('id', answerId)
      .single();

    if (answer) {
      
      // --- A) REDIS GÜNCELLEME (Sıralama Algoritması) ---
      if (redis) {
        try {
          const baseScore = (answer.upvotes * 10) - (answer.downvotes * 15);
          const ageHours = Math.max(0.016, (Date.now() - new Date(answer.created_at).getTime()) / 3600000);
          const rankScore = baseScore / Math.pow(ageHours + 2, 1.8);
          
          await redis.zadd('babylexit:global_feed', rankScore, answerId);
        } catch (redisErr) {
          console.error("Redis Hatası:", redisErr);
        }
      }

      // --- B) YENİ: İTİBAR (REPUTATION) GÜNCELLEME ---
      // Cevap sahibi varsa ve oy veren kişi kendisi değilse (Hile koruması)
      if (answer.user_id && answer.user_id !== user.id) {
        try {
          // voteType 1 ise UPVOTE, -1 ise DOWNVOTE
          const reputationType = voteType === 1 ? 'UPVOTE' : 'DOWNVOTE';
          
          // Arka planda puan ekle/çıkar
          await addReputation(answer.user_id, reputationType, answerId);
          
        } catch (repError) {
          console.error("Reputation Hatası:", repError);
          // İtibar hatası oylamayı bozmasın, sadece logla.
        }
      }
    }
  } catch (dataError) {
    console.error("Veri Çekme Hatası:", dataError);
  }

  // 4. Arayüzü Yenile
  revalidatePath('/questions', 'layout'); 
  
  return { success: true };
}