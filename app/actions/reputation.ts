'use server';

import { createClient } from "@/utils/supabase/server";

// PUAN TARİFESİ
const POINTS = {
  UPVOTE: 5,           // Beğeni (Ödül)
  DOWNVOTE: -2,        // Beğenmeme (Ceza)
  AI_REFERENCE: 50,    // AI Seçimi (Büyük Ödül)
  ACCEPTED_ANSWER: 20  // Doğru Cevap Seçimi
};

export async function addReputation(
  userId: string, 
  type: 'UPVOTE' | 'DOWNVOTE' | 'AI_REFERENCE' | 'ACCEPTED_ANSWER', 
  itemId: string
) {
  const supabase = await createClient();
  const points = POINTS[type];

  console.log(`🔋 REPÜTASYON İŞLENİYOR: User: ${userId} | Tip: ${type} | Puan: ${points}`);

  // 1. Log Tablosuna İşle (Geçmişi görmek için)
  await supabase.from('reputation_logs').insert({
    user_id: userId,
    amount: points,
    source_type: type,
    related_item_id: itemId
  });

  // 2. Profildeki Ana Puanları Güncelle
  const { data: profile } = await supabase
    .from('profiles')
    .select('reputation, community_upvotes, ai_endorsements')
    .eq('id', userId)
    .single();

  if (profile) {
    const updates: any = {
      reputation: (profile.reputation || 0) + points
    };

    // Özel Sayaçlar
    if (type === 'UPVOTE') {
      updates.community_upvotes = (profile.community_upvotes || 0) + 1;
    } 
    else if (type === 'DOWNVOTE') {
      // Downvote yiyince community puanı düşsün mü? Evet.
      updates.community_upvotes = Math.max(0, (profile.community_upvotes || 0) - 1);
    }
    else if (type === 'AI_REFERENCE') {
      updates.ai_endorsements = (profile.ai_endorsements || 0) + 1;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    
    if (error) console.error("Repütasyon güncelleme hatası:", error);
  }
}