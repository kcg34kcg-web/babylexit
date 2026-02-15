'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- TİPLER ---
export type VoteResponse = {
  success?: boolean;
  error?: string;
  requiresPersuasion?: boolean; // Taraf değiştiriyorsa frontend'e "Modalı Aç" der
  candidates?: any[]; // İkna adayları
};

// --- 1. MÜNAZARA AKIŞI (Feed) ---
export async function getDebateFeed(page = 0, limit = 10) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: debates, error } = await supabase
    .from('social_debates')
    .select(`
      *,
      profiles:created_by (username, full_name, avatar_url, job_title)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error || !debates) return [];

  // İstatistikleri topla
  const enrichedDebates = await Promise.all(debates.map(async (debate) => {
    // Toplam oyları hızlıca al (rpc veya count ile optimize edilebilir)
    const { count: countA } = await supabase.from('social_debate_votes').select('*', { count: 'exact', head: true }).eq('debate_id', debate.id).eq('choice', 'A');
    const { count: countB } = await supabase.from('social_debate_votes').select('*', { count: 'exact', head: true }).eq('debate_id', debate.id).eq('choice', 'B');

    let userVote = null;
    let changeCount = 0;

    if (user) {
      const { data: vote } = await supabase
        .from('social_debate_votes')
        .select('choice, change_count')
        .eq('debate_id', debate.id)
        .eq('user_id', user.id)
        .single();
      if (vote) {
        userVote = vote.choice;
        changeCount = vote.change_count || 0;
      }
    }

    return {
      ...debate,
      stats: { a: countA || 0, b: countB || 0, total: (countA || 0) + (countB || 0) },
      userVote,
      changeCount // Frontend'de kalan hakkı göstermek için
    };
  }));

  return enrichedDebates;
}

// --- 2. OY VERME VE TARAF DEĞİŞTİRME (Critical Logic) ---
export async function voteDebate(debateId: string, choice: 'A' | 'B'): Promise<VoteResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız." };

  // Mevcut oyu kontrol et
  const { data: existingVote } = await supabase
    .from('social_debate_votes')
    .select('*')
    .eq('debate_id', debateId)
    .eq('user_id', user.id)
    .single();

  // A) İlk defa oy veriyor
  if (!existingVote) {
    const { error } = await supabase
      .from('social_debate_votes')
      .insert({ debate_id: debateId, user_id: user.id, choice, change_count: 0 });
    
    if (error) return { error: "Oy kaydedilemedi." };
    revalidatePath('/social');
    return { success: true };
  }

  // B) Aynı tarafa tekrar tıkladı -> İşlem yok
  if (existingVote.choice === choice) {
    return { success: true }; // Değişiklik yok
  }

  // C) Taraf Değiştiriyor (BUG 6 Çözümü: Server-side Kontrol)
  if ((existingVote.change_count || 0) >= 3) {
    return { error: "Fikir değiştirme hakkınız (3/3) doldu. Artık sadık kalmalısınız!" };
  }

  // İkna eden adayları getir (BUG 3 Çözümü: Kendi yorumunu hariç tut)
  // Karşı tarafın en yüksek "ikna puanlı" yorumlarını getiriyoruz.
  const { data: candidates } = await supabase
    .from('social_debate_comments')
    .select(`
        id, content, persuasion_count,
        profiles (full_name, avatar_url, job_title)
    `)
    .eq('debate_id', debateId)
    .eq('side', choice) // Geçmek istediği tarafın yorumları
    .neq('user_id', user.id) // BUG 3: Kendini ikna edemezsin
    .order('persuasion_count', { ascending: false }) // BUG 5: İkna sayısına göre sırala
    .limit(5);

  return { 
    requiresPersuasion: true, // Frontend'e modal açması gerektiğini söyle
    candidates: candidates || [] 
  };
}

// --- 3. FİKİR DEĞİŞİKLİĞİNİ ONAYLA (Confirm Change) ---
export async function confirmVoteChange(
    debateId: string, 
    newChoice: 'A' | 'B', 
    convincedByCommentId: string | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    // Transaction mantığı (Supabase RPC kullanmak daha iyidir ama burada sıralı işlem yapacağız)
    
    // 1. Oyu güncelle ve sayacı artır
    const { data: vote, error: voteError } = await supabase.rpc('increment_vote_change', {
        p_debate_id: debateId,
        p_user_id: user.id,
        p_new_choice: newChoice
    });
    
    // Not: 'increment_vote_change' RPC fonksiyonunu SQL'de tanımlamak en güvenlisidir. 
    // Ancak manuel yaparsak:
    const { data: currentVote } = await supabase.from('social_debate_votes').select('change_count').eq('debate_id', debateId).eq('user_id', user.id).single();
    if(!currentVote) return { error: "Oy bulunamadı." };

    await supabase
        .from('social_debate_votes')
        .update({ 
            choice: newChoice, 
            change_count: currentVote.change_count + 1 
        })
        .eq('debate_id', debateId) 
        .eq('user_id', user.id);

    // 2. İkna eden yoruma puan ver (Eğer seçildiyse)
    if (convincedByCommentId) {
        // SQL Injection yok, RPC kullanmak best practice olurdu: increment_persuasion
        const { data: comment } = await supabase.from('social_debate_comments').select('persuasion_count').eq('id', convincedByCommentId).single();
        if (comment) {
            await supabase
                .from('social_debate_comments')
                .update({ persuasion_count: comment.persuasion_count + 1 })
                .eq('id', convincedByCommentId);
        }
    }

    // 3. Kullanıcının ESKİ yorumlarını sil (BUG 4 Çözümü: Await ile bekle)
    // Yeni geçtiği tarafa aykırı olan eski yorumları temizle
    const oldSide = newChoice === 'A' ? 'B' : 'A';
    await supabase
        .from('social_debate_comments')
        .delete()
        .eq('debate_id', debateId)
        .eq('user_id', user.id)
        .eq('side', oldSide);

    revalidatePath('/social');
    return { success: true };
}

// --- 4. YORUMLARI GETİR ---
export async function getDebateComments(debateId: string) {
  const supabase = await createClient();
  
  // BUG 2 ve 5 Çözümü: persuasion_count çekiliyor ve sıralama buna göre yapılıyor
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

// --- 5. YORUM EKLEME (Side-Locking devam ediyor) ---
export async function postDebateComment(debateId: string, content: string, side: 'A' | 'B') {
    // ... (Mevcut kodundaki mantık doğru, aynen kalabilir)
    // Sadece vote kontrolünü unutma
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Giriş yapmalısınız." };

    const { data: vote } = await supabase
        .from('social_debate_votes')
        .select('choice')
        .eq('debate_id', debateId)
        .eq('user_id', user.id)
        .single();
    
    if (!vote || vote.choice !== side) {
        return { error: "Sadece savunduğun tarafa yorum yapabilirsin!" };
    }

    const { error } = await supabase.from('social_debate_comments').insert({
        debate_id: debateId, user_id: user.id, content, side, persuasion_count: 0
    });
    
    if (error) return { error: "Yorum gönderilemedi" };
    revalidatePath('/social');
    return { success: true };
}