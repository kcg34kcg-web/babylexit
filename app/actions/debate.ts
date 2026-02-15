'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- TİPLER ---
export type VoteResponse = {
  success?: boolean;
  error?: string;
  requiresPersuasion?: boolean;
  candidates?: any[];
  newStats?: { a: number, b: number };
  userVote?: 'A' | 'B';
};

export type Debate = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  created_by: any;
  stats: { a: number; b: number; total: number };
  userVote: 'A' | 'B' | null;
  changeCount: number;
  is_active: boolean;
  is_daily?: boolean; // Yeni alan
};

// --- 1. GÜNÜN TARTIŞMASINI GETİR (YENİ) ---
// Artık widget hardcoded veri yerine bunu kullanacak
export async function getDailyDebate() {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Önce bugünün özel tartışması var mı bakalım
    const { data: daily, error } = await supabase
        .from('social_debates')
        .select(`
            *,
            profiles:created_by (full_name, avatar_url)
        `)
        .eq('is_daily_featured', true)
        .eq('featured_date', today)
        .maybeSingle();

    if (error) console.error("Daily Fetch Error:", error);

    // Eğer bugün için özel seçilmiş yoksa, en çok oy alanı getir (Fallback mekanizması)
    if (!daily) {
         const { data: popular } = await supabase
            .from('social_debates')
            .select('*')
            .eq('is_active', true)
            .order('vote_count_a', { ascending: false }) // Geçici sıralama mantığı
            .limit(1)
            .maybeSingle();
         return popular;
    }

    return daily;
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

  if (error) {
    console.error("Debate Feed Error:", error);
    return [];
  }

  if (!data) return [];

  return data.map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      created_at: d.created_at,
      created_by: d.created_by_data,
      stats: { 
          a: d.stats_a, 
          b: d.stats_b, 
          total: d.stats_a + d.stats_b 
      },
      userVote: d.user_vote,
      changeCount: d.user_change_count,
      is_active: d.is_active
  }));
}

// --- 3. OYLAMA İŞLEMİ (GÜNCELLENDİ) ---
export async function voteDailyDebate(debateId: string, choice: 'A' | 'B'): Promise<VoteResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Oy vermek için giriş yapmalısınız." };

  // RPC ile güvenli işlem
  const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_vote_transaction', {
      p_debate_id: debateId,
      p_user_id: user.id,
      p_new_choice: choice
  });

  if (rpcError) {
      // Hata mesajını yakalayıp kullanıcı dostu hale getirelim
      console.error("Vote Error:", rpcError);
      if (rpcError.message.includes("Fikir değiştirme limitiniz")) {
          return { error: "Fikir değiştirme limitiniz (3/3) doldu." };
      }
      return { error: "Oy işlemi başarısız oldu." };
  }

  // RPC'den dönen veri array olabilir
  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  
  if (!result || !result.success) {
      // Eğer limit dolduysa ve ikna modülü gerekiyorsa (RPC'den bu bilgi dönmeli veya burada kontrol edilmeli)
      // Şimdilik basit hata dönüyoruz, gelişmiş senaryoda burada 'requiresPersuasion' dönebiliriz.
      return { error: result?.message || "İşlem başarısız." };
  }

  revalidatePath('/social');
  return { 
      success: true, 
      newStats: { a: result.new_stats_a, b: result.new_stats_b },
      userVote: choice
  };
}

// --- 4. EKSİK OLAN FONKSİYON: İKNA PUANI VERME ---
export async function markAsPersuasive(debateId: string, commentId: string, commentAuthorId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Giriş yapmalısınız." };
    if (user.id === commentAuthorId) return { error: "Kendi yorumunuza ikna puanı veremezsiniz." };

    // 1. Daha önce bu yoruma ikna puanı vermiş mi kontrol et (Unique Constraint koruması olsa da)
    const { data: existing } = await supabase
        .from('social_persuasions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('persuaded_user_id', user.id)
        .maybeSingle();

    if (existing) {
        return { error: "Zaten bu yoruma puan verdiniz." };
    }

    // 2. Transaction benzeri işlem: Tabloya ekle + Yorum sayacını artır
    // Not: Gerçek atomiklik için bunu da bir RPC fonksiyonu yapmak en iyisidir ama şimdilik kod tarafında hallediyoruz.
    
    const { error: insertError } = await supabase.from('social_persuasions').insert({
        debate_id: debateId,
        comment_id: commentId,
        author_id: commentAuthorId,
        persuaded_user_id: user.id
    });

    if (insertError) {
        console.error("Persuasion Insert Error:", insertError);
        return { error: "İşlem sırasında hata oluştu." };
    }

    // Yorumun sayacını artır (RPC ile güvenli artış)
    // Eğer `increment_persuasion` fonksiyonun yoksa basit update yapıyoruz:
    const { error: updateError } = await supabase.rpc('increment_persuasion', { row_id: commentId });
    
    // Fallback: RPC yoksa manuel update (Riskli ama geçici çözüm)
    if (updateError) {
        const { error: manualUpdateError } = await supabase.rpc('increment_counter', { 
            table_name: 'social_debate_comments', 
            row_id: commentId, 
            col_name: 'persuasion_count' 
        });
        // Eğer o da yoksa, SQL yazmamız gerekecek. Şimdilik RPC var varsayıyoruz.
    }

    revalidatePath('/social');
    return { success: true };
}

// --- 5. YENİ MÜNAZARA OLUŞTUR ---
export async function createDebate(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Giriş yapmalısınız." };

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string || 'general';

    if (!title || title.trim().length < 5) {
        return { error: "Başlık çok kısa." };
    }

    const { data, error } = await supabase
        .from('social_debates')
        .insert({
            title: title.trim(),
            description: description.trim(),
            category,
            created_by: user.id,
            is_active: true,
            // Yeni yapıda varsayılan sayaçlar
            vote_count_a: 0,
            vote_count_b: 0
        })
        .select()
        .single();

    if (error) {
        return { error: "Münazara oluşturulamadı." };
    }

    revalidatePath('/social');
    return { success: true, debateId: data.id };
}

// --- 6. AI BAŞLIK ÖNERİLERİ (Geliştirilecek) ---
export async function generateSmartTitles(topic: string) {
    // İleride gerçek AI servisine bağlanacak.
    if (!topic || topic.length < 3) return [];
    
    return [
        `Yapay Zeka: ${topic} Hakkında Ne Düşünüyor?`,
        `${topic}: Toplumsal Etkileri Neler?`,
        `${topic} Yasaklanmalı mı?`,
        `Gelecekte ${topic} Nasıl Değişecek?`
    ];
}


// --- 7. YORUM EKLEME ---
export async function postDebateComment(debateId: string, content: string, side: 'A' | 'B') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Giriş yapmalısınız." };

    // Önce oy vermiş mi kontrol et
    const { data: vote } = await supabase
        .from('social_debate_votes')
        .select('choice')
        .eq('debate_id', debateId)
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (!vote) {
        return { error: "Yorum yapmadan önce tarafını seçmelisin!" };
    }

    const { error } = await supabase.from('social_debate_comments').insert({
        debate_id: debateId,
        user_id: user.id,
        content,
        side,
        persuasion_count: 0
    });
    
    if (error) return { error: "Yorum gönderilemedi" };
    
    revalidatePath('/social');
    return { success: true };
}
// --- app/actions/debate.ts DOSYASININ SONUNA EKLEYİN ---

// --- 8. TARAF DEĞİŞİKLİĞİNİ ONAYLA ---
export async function confirmVoteChange(
    debateId: string, 
    newChoice: 'A' | 'B', 
    convincedByCommentId: string
): Promise<VoteResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    // 1. İkna eden yoruma puan ver (Atomik artış)
    if (convincedByCommentId) {
        // Yorumun sahibini bul (Puan kazandırmak için)
        // Burada basitçe sayacı artırıyoruz, gelişmiş versiyonda 'social_persuasions' tablosuna da eklenmeli.
        const { error: boostError } = await supabase.rpc('increment_persuasion', { 
            row_id: convincedByCommentId 
        });
        
        if (boostError) {
             console.error("Persuasion Boost Error:", boostError);
             // RPC yoksa manuel fallback (Yedek plan)
             const { data: comment } = await supabase
                .from('social_debate_comments')
                .select('persuasion_count')
                .eq('id', convincedByCommentId)
                .single();
             
             if (comment) {
                 await supabase
                     .from('social_debate_comments')
                     .update({ persuasion_count: (comment.persuasion_count || 0) + 1 })
                     .eq('id', convincedByCommentId);
             }
        }
    }

    // 2. Oyu güncelle (RPC ile)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_vote_transaction', {
        p_debate_id: debateId,
        p_user_id: user.id,
        p_new_choice: newChoice
    });

    if (rpcError) {
        console.error("Confirm Vote Error:", rpcError);
        return { error: "Değişiklik kaydedilemedi." };
    }

    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    
    revalidatePath('/social');
    return { 
        success: true,
        newStats: { a: result?.new_stats_a || 0, b: result?.new_stats_b || 0 },
        userVote: newChoice
    };
}
// --- app/actions/debate.ts DOSYASININ SONUNA EKLEYİN ---

// --- 9. YORUMLARI GETİR ---
export async function getDebateComments(debateId: string) {
    const supabase = await createClient();
    
    // Yorumları ve yazarlarını çek
    const { data, error } = await supabase
        .from('social_debate_comments')
        .select(`
            id,
            content,
            side,
            persuasion_count,
            created_at,
            profiles:user_id (
                id,
                username,
                full_name,
                avatar_url,
                job_title,
                reputation_score
            )
        `)
        .eq('debate_id', debateId)
        .order('persuasion_count', { ascending: false }) // En ikna ediciler üstte
        .order('created_at', { ascending: false });      // Sonra yeniler

    if (error) {
        console.error("Comments Fetch Error:", error);
        return [];
    }

    return data;
}