'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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

  // Veritabanında oluşturduğumuz RPC (Remote Procedure Call) fonksiyonunu tetikliyoruz
  const { error: rpcError } = await supabase.rpc('vote_answer', {
    p_answer_id: answerId,
    p_user_id: user.id,
    p_vote_type: voteType
  });

  if (rpcError) {
    console.error("RPC Oylama Hatası:", rpcError);
    return { error: "Oylama işlemi başarısız oldu." };
  }

  /**
   * Revalidasyon: 
   * Sadece '/questions' (liste) değil, tüm soru yapısını yenilemek 
   * oyların anında yansımasını sağlar.
   */
  revalidatePath('/questions', 'layout'); 
  
  return { success: true };
}