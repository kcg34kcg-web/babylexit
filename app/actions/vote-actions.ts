'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redis } from "@/lib/redis"; // Redis bağlantısını içe aktarıyoruz

/**
 * Bir cevaba oy verme işlemini (Upvote/Downvote) gerçekleştirir.
 */
export async function voteAction(answerId: string, voteType: 1 | -1) {
  // Next.js 15 ve Supabase Server Client kullanımı
  const supabase = await createClient();

  // Oturum kontrolü
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: "Oylamak için giriş yapmalısınız." };
  }

  if (!answerId) {
    return { error: "Geçersiz cevap ID'si." };
  }

  // Veritabanında oluşturduğumuz RPC fonksiyonunu tetikliyoruz
  const { error: rpcError } = await supabase.rpc('vote_answer', {
    p_answer_id: answerId,
    p_user_id: user.id,
    p_vote_type: voteType
  });

  if (rpcError) {
    console.error("RPC Oylama Hatası:", rpcError);
    return { error: "Oylama işlemi başarısız oldu." };
  }

  // --- REDIS GÜNCELLEME KISMI ---
  try {
    // Redis'e bağlantı varsa işlemi yap
    if (redis) {
      // 1. Güncel post/cevap verisini çek (Skor hesaplamak için)
      const { data: answer } = await supabase
        .from('answers')
        .select('upvotes, downvotes, created_at')
        .eq('id', answerId)
        .single();

      if (answer) {
        // Bölüm 4'teki Algoritma: (Upvotes * 10) - (Downvotes * 15)
        const baseScore = (answer.upvotes * 10) - (answer.downvotes * 15);
        
        // Zaman çarpanı (Basit bir rank_score hesaplaması)
        const ageHours = Math.max(0.016, (Date.now() - new Date(answer.created_at).getTime()) / 3600000);
        const rankScore = baseScore / Math.pow(ageHours + 2, 1.8);

        // Redis Global Feed ZSET'ine ekle/güncelle
        await redis.zadd('babylexit:global_feed', rankScore, answerId);
      }
    }
  } catch (redisError) {
    // Redis hatası oylama işlemini durdurmasın diye sadece logluyoruz
    console.error("Redis Skor Güncelleme Hatası:", redisError);
  }
  // --- REDIS SONU ---

  /**
   * Revalidasyon: 
   * Sadece '/questions' (liste) değil, tüm soru yapısını yenilemek 
   * oyların anında yansımasını sağlar.
   */
  revalidatePath('/questions', 'layout'); 
  
  return { success: true };
}