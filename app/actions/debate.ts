'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- TİPLER ---
export type VoteResponse = {
  success?: boolean;
  error?: string;
  requiresPersuasion?: boolean; // Taraf değiştiriyorsa frontend'e "Modalı Aç" der
  candidates?: any[]; // İkna adayları
  newStats?: { a: number, b: number }; // BUG 12 Fix: Güncel istatistikleri dönüyoruz
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
};

// --- 1. MÜNAZARA AKIŞI (Feed) - TAMAMEN OPTİMİZE EDİLDİ ---
export async function getDebateFeed(page = 0, limit = 10, search?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Eski "Promise.all" döngüsü tamamen silindi.
  // Yerine tek bir RPC çağrısı yapıyoruz.
  
  const { data, error } = await supabase.rpc('get_debate_feed', {
      p_user_id: user?.id || null, // Giriş yapmamışsa null gider
      p_limit: limit,
      p_offset: page * limit,
      p_search: search || null
  });

  if (error) {
    console.error("Debate Feed Error:", error);
    return [];
  }

  if (!data) return [];

  // SQL'den gelen veriyi Frontend'in beklediği 'Debate' tipine dönüştürüyoruz
  const mappedDebates = data.map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      created_at: d.created_at,
      created_by: d.created_by_data, // JSON olarak SQL'den geldi
      stats: { 
          a: d.stats_a, 
          b: d.stats_b, 
          total: d.stats_a + d.stats_b 
      },
      userVote: d.user_vote,
      changeCount: d.user_change_count,
      is_active: d.is_active
  }));

  return mappedDebates;
}

// --- 2. GÜNLÜK MÜNAZARA OYLAMA (BUG 1 FIX) ---
export async function voteDailyDebate(debateId: string, choice: 'A' | 'B'): Promise<VoteResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Oy vermek için giriş yapmalısınız." };

  // 1. Mevcut durumu kontrol et (Frontend'e "İkna Modalı" açtırmak için)
  const { data: existingVote } = await supabase
    .from('social_debate_votes')
    .select('*')
    .eq('debate_id', debateId)
    .eq('user_id', user.id)
    .maybeSingle();

  // Eğer taraf değiştiriyorsa ve limit dolmadıysa -> İkna süreci başlat
  if (existingVote && existingVote.choice !== choice) {
      if ((existingVote.change_count || 0) >= 3) {
          return { error: "Fikir değiştirme hakkınız (3/3) doldu. Artık sadık kalmalısınız!" };
      }

      // BUG 3 FIX: Kendi yorumunu hariç tut, en ikna edici karşıt görüşleri getir
      const { data: candidates } = await supabase
        .from('social_debate_comments')
        .select(`
            id, content, persuasion_count,
            profiles (full_name, avatar_url, job_title)
        `)
        .eq('debate_id', debateId)
        .eq('side', choice) // Geçmek istediği taraf
        .neq('user_id', user.id) // Kendini ikna edemezsin
        .order('persuasion_count', { ascending: false }) // En popülerler
        .limit(3);

      return { 
        requiresPersuasion: true, // Frontend modalı tetikler
        candidates: candidates || [] 
      };
  }

  // 2. Normal Oy Verme (veya Taraf Değiştirme onayı gerektirmeyen durumlar)
  // RPC fonksiyonunu çağır (Atomik işlem)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_vote_transaction', {
      p_debate_id: debateId,
      p_user_id: user.id,
      p_new_choice: choice
  });

  if (rpcError) {
      console.error("RPC Error:", rpcError);
      return { error: "Oy işlemi sırasında hata oluştu." };
  }

  // RPC'den dönen güncel istatistikler (Optimistic UI için)
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

// --- 3. FİKİR DEĞİŞİKLİĞİNİ ONAYLA (Confirm Change) ---
export async function confirmVoteChange(
    debateId: string, 
    newChoice: 'A' | 'B', 
    convincedByCommentId: string | null
): Promise<VoteResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    // 1. İkna eden yoruma puan ver (Eğer seçildiyse)
    if (convincedByCommentId) {
        const { error: boostError } = await supabase.rpc('increment_persuasion', { 
            row_id: convincedByCommentId 
        });
        
        if (boostError) {
             const { data: comment } = await supabase.from('social_debate_comments').select('persuasion_count').eq('id', convincedByCommentId).single();
             if (comment) {
                 await supabase
                     .from('social_debate_comments')
                     .update({ persuasion_count: (comment.persuasion_count || 0) + 1 })
                     .eq('id', convincedByCommentId);
             }
        }
    }

    // 2. Oyu ve istatistikleri güncelle (RPC üzerinden)
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

// --- 4. YENİ MÜNAZARA OLUŞTUR (GÜVENLİK GÜNCELLEMESİ) ---
export async function createDebate(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Giriş yapmalısınız." };

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string || 'general';

    // SERVER-SIDE VALIDATION (Bug Fix)
    if (!title || title.trim().length < 5) {
        return { error: "Başlık çok kısa. En az 5 karakter olmalı." };
    }
     
    if (!description || description.trim().length < 10) {
        return { error: "Açıklama çok kısa. Tartışma bağlamını belirtmelisiniz." };
    }

    const { data, error } = await supabase
        .from('social_debates')
        .insert({
            title: title.trim(),
            description: description.trim(),
            category,
            created_by: user.id,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        console.error("Create Debate Error:", error);
        return { error: "Münazara oluşturulamadı. Lütfen daha sonra tekrar deneyin." };
    }

    revalidatePath('/social');
    return { success: true, debateId: data.id };
}

// --- 5. AI BAŞLIK ÖNERİLERİ (BUG 3 & 15 FIX) ---
export async function generateSmartTitles(topic: string) {
    // Gerçek bir AI servisi entegre edilene kadar simülasyon.
    await new Promise(resolve => setTimeout(resolve, 800)); // Yapay gecikme

    if (!topic || topic.length < 3) return [];

    return [
        `Yapay Zeka: ${topic} Meslekleri Bitirecek mi, Dönüştürecek mi?`,
        `${topic} Yasaklanmalı mı, Düzenlenmeli mi?`,
        `Geleneksel ${topic} vs Modern Yaklaşımlar: Hangisi Gelecek?`,
        `${topic} Etik Sınırları Aşıyor mu?`,
        `Toplum ${topic} Konusunda İkiyüzlü mü Davranıyor?`
    ];
}

// --- 6. YORUMLARI GETİR ---
export async function getDebateComments(debateId: string) {
  const supabase = await createClient();
  
  const { data: comments, error } = await supabase
    .from('social_debate_comments')
    .select(`
      *,
      profiles (full_name, username, avatar_url, job_title)
    `)
    .eq('debate_id', debateId)
    .order('persuasion_count', { ascending: false }) // En ikna ediciler üstte
    .order('created_at', { ascending: false }); // Sonra yeniler

  if (error || !comments) return [];
  return comments;
}

// --- 7. YORUM EKLEME (BUG 7 FIX) ---
export async function postDebateComment(debateId: string, content: string, side: 'A' | 'B') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Giriş yapmalısınız." };

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
        side, // Yorumun hangi tarafı savunduğu
        persuasion_count: 0
    });
    
    if (error) return { error: "Yorum gönderilemedi" };
    
    revalidatePath('/social');
    return { success: true };
}