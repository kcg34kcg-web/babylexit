'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. MÜNAZARA AKIŞINI ÇEK (Feed) ---
// Vitrin Modu: Sadece kart bilgilerini çeker, yorumları çekmez (Hızlı Yükleme)
export async function getDebateFeed(page = 0, limit = 10) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Münazaraları tarih sırasına göre çek
  const { data: debates, error } = await supabase
    .from('social_debates')
    .select(`
      *,
      profiles:created_by (username, full_name, avatar_url)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error || !debates) return [];

  // 2. Her bir münazara için istatistikleri ve kullanıcının oyunu topla
  const enrichedDebates = await Promise.all(debates.map(async (debate) => {
    // A) Oy Sayıları
    const { count: countA } = await supabase
      .from('social_debate_votes')
      .select('*', { count: 'exact', head: true })
      .eq('debate_id', debate.id)
      .eq('choice', 'A');

    const { count: countB } = await supabase
      .from('social_debate_votes')
      .select('*', { count: 'exact', head: true })
      .eq('debate_id', debate.id)
      .eq('choice', 'B');

    // B) Bu kullanıcı oy vermiş mi?
    let userVote = null;
    if (user) {
      const { data: vote } = await supabase
        .from('social_debate_votes')
        .select('choice')
        .eq('debate_id', debate.id)
        .eq('user_id', user.id)
        .single();
      if (vote) userVote = vote.choice;
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
  }));

  return enrichedDebates;
}

// --- 2. YENİ MÜNAZARA OLUŞTUR (Create) ---
export async function createDebate(topic: string, optionA: string, optionB: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Münazara başlatmak için giriş yapmalısınız." };
  if (!topic || !optionA || !optionB) return { error: "Tüm alanları doldurunuz." };

  const { error } = await supabase
    .from('social_debates')
    .insert({
      created_by: user.id,
      topic,
      option_a: optionA,
      option_b: optionB,
      // ai_summary: Bunu bir arka plan görevi veya AI API çağrısı ile doldurabiliriz
    });

  if (error) return { error: "Münazara oluşturulamadı." };
  
  revalidatePath('/social');
  return { success: true };
}

// --- 3. MÜNAZARAYA OY VER (Vote Debate) ---
export async function voteDebate(debateId: string, choice: 'A' | 'B') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız." };

  // Daha önce oy vermiş mi kontrolü
  const { data: existingVote } = await supabase
    .from('social_debate_votes')
    .select('id')
    .eq('debate_id', debateId)
    .eq('user_id', user.id)
    .single();

  if (existingVote) return { error: "Zaten tarafınızı seçtiniz, değiştiremezsiniz." };

  const { error } = await supabase
    .from('social_debate_votes')
    .insert({ debate_id: debateId, user_id: user.id, choice });

  if (error) return { error: "İşlem başarısız." };

  revalidatePath('/social');
  return { success: true };
}

// --- 4. YORUM GÖNDER (🔒 SIDE-LOCKING KORUMALI) ---
export async function postDebateComment(debateId: string, content: string, side: 'A' | 'B') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız." };
  if (!content.trim()) return { error: "Boş yorum atılamaz." };

  // 🛡️ GÜVENLİK KONTROLÜ: Kullanıcı gerçekten bu tarafa mı oy vermiş?
  const { data: vote } = await supabase
    .from('social_debate_votes')
    .select('choice')
    .eq('debate_id', debateId)
    .eq('user_id', user.id)
    .single();

  if (!vote) {
    return { error: "Önce oy kullanarak tarafınızı seçmelisiniz!" };
  }

  if (vote.choice !== side) {
    return { error: `Siz '${vote.choice}' tarafını seçtiniz, karşı tarafa yorum yazamazsınız!` };
  }

  // Kontrol geçildi, yorumu ekle
  const { error } = await supabase
    .from('social_debate_comments')
    .insert({
      debate_id: debateId,
      user_id: user.id,
      content,
      side
    });

  if (error) return { error: "Yorum gönderilemedi." };
  
  revalidatePath('/social'); 
  return { success: true };
}

// --- 5. YORUMLARI GETİR (Lazy Load) ---
export async function getDebateComments(debateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: comments, error } = await supabase
    .from('social_debate_comments')
    .select(`
      id,
      content,
      side,
      created_at,
      profiles (full_name, username, avatar_url),
      user_id
    `)
    .eq('debate_id', debateId)
    .order('created_at', { ascending: false });

  if (error || !comments) return [];

  const enrichedComments = await Promise.all(comments.map(async (c) => {
     const { data: votes } = await supabase
        .from('social_comment_votes')
        .select('vote_type')
        .eq('comment_id', c.id);
     
     const score = votes?.reduce((acc, v) => acc + v.vote_type, 0) || 0;

     let userVoteStatus = 0;
     if (user) {
        const myVoteData = await supabase
            .from('social_comment_votes')
            .select('vote_type')
            .eq('comment_id', c.id)
            .eq('user_id', user.id)
            .single();
        if(myVoteData.data) userVoteStatus = myVoteData.data.vote_type;
     }

     return { ...c, score, userVoteStatus };
  }));

  return enrichedComments;
}

// --- 6. YORUMA OY VER (Up/Down) ---
export async function voteComment(commentId: string, voteType: 1 | -1) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) return { error: "Giriş yapmalısınız." };

    const { data: comment } = await supabase
        .from('social_debate_comments')
        .select('user_id')
        .eq('id', commentId)
        .single();
    
    if (comment && comment.user_id === user.id) {
        return { error: "Kendi yorumunuza oy veremezsiniz." };
    }

    const { data: existingVote } = await supabase
        .from('social_comment_votes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

    if (existingVote) {
        if (existingVote.vote_type === voteType) {
            await supabase.from('social_comment_votes').delete().eq('id', existingVote.id);
            return { success: true, message: "Oy geri alındı" };
        }
        await supabase
            .from('social_comment_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
    } else {
        await supabase
            .from('social_comment_votes')
            .insert({ comment_id: commentId, user_id: user.id, vote_type: voteType });
    }

    revalidatePath('/social');
    return { success: true };
}

// --- 7. GÜNLÜK MÜNAZARAYI GETİR ---
export async function getDailyDebate() {
  const feed = await getDebateFeed(0, 1);
  return feed?.[0] || null;
}

// --- 8. GÜNLÜK MÜNAZARAYA OY VER (YENİ EKLENEN) ---
// DailyDebateWidget tarafından kullanılan fonksiyon
export async function voteDailyDebate(debateId: string, choice: 'A' | 'B') {
  return await voteDebate(debateId, choice);
}