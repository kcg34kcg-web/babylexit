'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { VoteResponse } from "./types";

// --- 1. OYLAMA İŞLEMİ ---
export async function voteDailyDebate(debateId: string, choice: 'A' | 'B'): Promise<VoteResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Oy vermek için giriş yapmalısınız." };

  const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_vote_transaction', {
      p_debate_id: debateId,
      p_user_id: user.id,
      p_new_choice: choice
  });

  if (rpcError) {
      if (rpcError.message.includes("Fikir değiştirme limitiniz")) {
          return { error: "Fikir değiştirme limitiniz (3/3) doldu." };
      }
      return { error: "Oy işlemi başarısız oldu." };
  }

  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  revalidatePath('/social');
  
  return { 
      success: true, 
      newStats: { a: result.new_stats_a, b: result.new_stats_b },
      userVote: choice
  };
}

// --- 2. İKNA (ALKIŞ) PUANI VERME ---
// *** DEBUG MODU AKTİF ***
export async function markAsPersuasive(debateId: string, commentId: string, commentAuthorId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Kontroller
    if (!user) return { error: "Giriş yapmalısınız." };
    if (user.id === commentAuthorId) return { error: "Kendi yorumunuza alkış atamazsınız." };

    console.log("DEBUG: markAsPersuasive başladı. User:", user.id, "Comment:", commentId);

    // 2. Daha önce alkışlamış mı veritabanından kontrol et
    const { data: existing, error: fetchError } = await supabase
        .from('social_persuasions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('persuaded_user_id', user.id)
        .maybeSingle();

    if (fetchError) {
        console.error("DEBUG Fetch Error:", fetchError);
        // Eğer tablo yoksa burada hata verir
        return { error: `Kontrol Hatası: ${fetchError.message} (Tablo eksik olabilir)` };
    }

    if (existing) {
        return { error: "Zaten bu yorumu alkışladınız." };
    }

    // 3. Tabloya ekle
    const { error: insertError } = await supabase.from('social_persuasions').insert({
        debate_id: debateId,
        comment_id: commentId,
        author_id: commentAuthorId,
        persuaded_user_id: user.id
    });

    if (insertError) {
        console.error("DEBUG Insert Error:", insertError);
        
        // Eğer aynı anda iki kere tıklandıysa (Unique constraint hatası)
        if (insertError.code === '23505') {
             return { error: "Zaten alkışladınız." };
        }
        
        // *** DEBUG: Gerçek hatayı ekrana basıyoruz ***
        return { error: `DB Kayıt Hatası: ${insertError.message} (Kod: ${insertError.code})` };
    }

    // 4. Sayacı Artır (RPC ile)
    const { error: rpcError } = await supabase.rpc('increment_persuasion', { row_id: commentId });
    
    // Eğer özel RPC yoksa veya hata verirse, eski yöntemle dene (Fallback)
    if (rpcError) {
        console.error("DEBUG RPC Error:", rpcError);
        console.log("RPC başarısız, eski increment_counter deneniyor...");

        const { error: fallbackError } = await supabase.rpc('increment_counter', { 
            table_name: 'social_debate_comments', 
            row_id: commentId, 
            col_name: 'persuasion_count' 
        });

        if (fallbackError) {
             console.error("DEBUG Fallback Error:", fallbackError);
             // Sayaç artmasa bile işlem başarılı sayılabilir ama hatayı görelim
             return { error: `Sayaç Artırma Hatası: ${rpcError.message}` };
        }
    }

    // 5. Sayfayı yenile ki yeni sayı görünsün
    revalidatePath('/social');
    return { success: true };
}

// --- 3. YORUM EKLEME ---
export async function postDebateComment(debateId: string, content: string, side: 'A' | 'B') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Giriş yapmalısınız." };

    const { data: vote } = await supabase.from('social_debate_votes').select('choice').eq('debate_id', debateId).eq('user_id', user.id).maybeSingle();
    
    if (!vote) return { error: "Önce tarafını seçmelisin!" };
    if (vote.choice !== side) return { error: "Sadece seçtiğin taraf için yazabilirsin." };

    const { data: existing } = await supabase.from('social_debate_comments').select('id').eq('debate_id', debateId).eq('user_id', user.id).maybeSingle();
    if (existing) return { error: "Zaten bir görüş bildirdin." };

    const { data: savedComment, error } = await supabase
        .from('social_debate_comments')
        .insert({
            debate_id: debateId,
            user_id: user.id,
            content: content,
            side: side,
            persuasion_count: 0
        })
        .select(`*, profiles:user_id (id, full_name, avatar_url, job_title)`)
        .single();
    
    if (error) return { error: "Yorum eklenirken hata oluştu: " + error.message };
    
    revalidatePath('/social');
    return { success: true, savedData: savedComment };
}

// --- 4. YENİ MÜNAZARA OLUŞTUR ---
export async function createDebate(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Giriş yapmalısınız." };

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string || 'general';

    if (!title || title.trim().length < 5) return { error: "Başlık çok kısa." };

    const { data, error } = await supabase
        .from('social_debates')
        .insert({
            title: title.trim(), description: description.trim(), category,
            created_by: user.id, is_active: true, vote_count_a: 0, vote_count_b: 0
        })
        .select()
        .single();

    if (error) return { error: "Oluşturulamadı." };
    revalidatePath('/social');
    return { success: true, debateId: data.id };
}

// --- 5. TARAF DEĞİŞİKLİĞİ ONAY ---
export async function confirmVoteChange(debateId: string, newChoice: 'A' | 'B', convincedByCommentId: string): Promise<VoteResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    if (convincedByCommentId) {
        await supabase.rpc('increment_persuasion', { row_id: convincedByCommentId });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_vote_transaction', {
        p_debate_id: debateId,
        p_user_id: user.id,
        p_new_choice: newChoice
    });

    if (rpcError) return { error: "Değişiklik kaydedilemedi." };

    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    revalidatePath('/social');
    
    return { 
        success: true,
        newStats: { a: result?.new_stats_a || 0, b: result?.new_stats_b || 0 },
        userVote: newChoice
    };
}