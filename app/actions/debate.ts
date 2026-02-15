'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from 'next/cache';
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

// --- 1. GÜNÜN TARTIŞMASINI GETİR (DÜZELTİLDİ) ---
// Widget'taki "undefined (reading 'a')" hatasını çözer ve kullanıcı oyunu getirir.
export async function getDailyDebate() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    // 1. Önce bugünün özel tartışması var mı bakalım
    let { data: rawDebate, error } = await supabase
        .from('social_debates')
        .select(`
            *,
            profiles:created_by (full_name, avatar_url)
        `)
        .eq('is_daily_featured', true)
        .eq('featured_date', today)
        .maybeSingle();

    if (error) console.error("Daily Fetch Error:", error);

    // 2. Eğer bugün için özel seçilmiş yoksa, en çok oy alanı getir (Fallback)
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

    // 3. Kullanıcının bu tartışmadaki oy durumunu kontrol et
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

    // 4. Veriyi Component'in beklediği 'Debate' formatına dönüştür
    // (Veritabanı sütunlarını 'stats' objesine map ediyoruz)
    const formattedDebate: Debate = {
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

    return formattedDebate;
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

// --- 3. OYLAMA İŞLEMİ ---
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
      console.error("Vote Error:", rpcError);
      if (rpcError.message.includes("Fikir değiştirme limitiniz")) {
          return { error: "Fikir değiştirme limitiniz (3/3) doldu." };
      }
      return { error: "Oy işlemi başarısız oldu." };
  }

  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  
  if (!result || !result.success) {
      return { error: result?.message || "İşlem başarısız." };
  }

  revalidatePath('/social');
  return { 
      success: true, 
      newStats: { a: result.new_stats_a, b: result.new_stats_b },
      userVote: choice
  };
}

// --- 4. İKNA PUANI VERME ---
export async function markAsPersuasive(debateId: string, commentId: string, commentAuthorId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Giriş yapmalısınız." };
    if (user.id === commentAuthorId) return { error: "Kendi yorumunuza ikna puanı veremezsiniz." };

    const { data: existing } = await supabase
        .from('social_persuasions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('persuaded_user_id', user.id)
        .maybeSingle();

    if (existing) {
        return { error: "Zaten bu yoruma puan verdiniz." };
    }

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

    const { error: updateError } = await supabase.rpc('increment_persuasion', { row_id: commentId });
    
    if (updateError) {
        const { error: manualUpdateError } = await supabase.rpc('increment_counter', { 
            table_name: 'social_debate_comments', 
            row_id: commentId, 
            col_name: 'persuasion_count' 
        });
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

// --- 6. AI BAŞLIK ÖNERİLERİ ---
export async function generateSmartTitles(topic: string) {
    if (!topic || topic.length < 3) return [];
    
    return [
        `Yapay Zeka: ${topic} Hakkında Ne Düşünüyor?`,
        `${topic}: Toplumsal Etkileri Neler?`,
        `${topic} Yasaklanmalı mı?`,
        `Gelecekte ${topic} Nasıl Değişecek?`
    ];
}

// --- 7. YORUM EKLEME (KESİN KAYIT & DATA DÖNÜŞÜ) ---
export async function postDebateComment(debateId: string, content: string, side: 'A' | 'B') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Giriş yapmalısınız." };

    // 1. Önce oy kontrolü
    const { data: vote } = await supabase
        .from('social_debate_votes')
        .select('choice')
        .eq('debate_id', debateId)
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (!vote) return { error: "Önce tarafını seçmelisin!" };
    if (vote.choice !== side) return { error: "Sadece seçtiğin taraf için yazabilirsin." };

    // 2. Mükerrer yorum kontrolü
    const { data: existing } = await supabase
        .from('social_debate_comments')
        .select('id')
        .eq('debate_id', debateId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existing) return { error: "Zaten bir görüş bildirdin. Hakkın doldu!" };

    // 3. Yorumu Ekle ve EKLENEN VERİYİ GERİ DÖNDÜR (select() önemli)
    const { data: savedComment, error } = await supabase
        .from('social_debate_comments')
        .insert({
            debate_id: debateId,
            user_id: user.id,
            content: content,
            side: side,
            persuasion_count: 0
        })
        .select(`
            *,
            profiles:user_id (
                id, full_name, avatar_url, job_title
            )
        `)
        .single(); // Tek bir obje dönmesini garanti et
    
    if (error) {
        console.error("Comment Insert Error:", error);
        return { error: "Veritabanı hatası: " + error.message };
    }
    
    revalidatePath('/social');
    // Kritik Nokta: Kaydedilen veriyi frontend'e geri gönderiyoruz
    return { success: true, savedData: savedComment };
}
// --- 8. TARAF DEĞİŞİKLİĞİNİ ONAYLA ---
export async function confirmVoteChange(
    debateId: string, 
    newChoice: 'A' | 'B', 
    convincedByCommentId: string
): Promise<VoteResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    if (convincedByCommentId) {
        const { error: boostError } = await supabase.rpc('increment_persuasion', { 
            row_id: convincedByCommentId 
        });
        
        if (boostError) {
             console.error("Persuasion Boost Error:", boostError);
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

export async function getDebateComments(debateId: string) {
    noStore(); // BU SATIR ÇOK ÖNEMLİ: Cache'i devre dışı bırakır, her zaman taze veri çeker.
    
    const supabase = await createClient();
    
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
        .order('persuasion_count', { ascending: false }) // En çok beğenilenler
        .order('created_at', { ascending: false });      // Sonra en yeniler

    if (error) {
        console.error("Comments Fetch Error:", error);
        return [];
    }

    return data;
}