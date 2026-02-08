'use server';

import { createClient } from "@/utils/supabase/server";

export async function rewardUserForAIReference(userId: string, questionId: string) {
  const supabase = await createClient();

  // 1. Önce bu kullanıcı bu sorudan daha önce 'AI Referans Ödülü' almış mı bakalım?
  // (Sürekli aynı cevabı çekip adama sonsuz puan vermeyelim)
  const { data: existingReward } = await supabase
    .from('user_rewards') // Bu tabloyu oluşturman gerekebilir veya mevcut puan tablonu kullan
    .select('id')
    .eq('user_id', userId)
    .eq('reason', 'ai_reference')
    .eq('reference_id', questionId) // Hangi soruda referans alındı?
    .single();

  if (existingReward) return; // Zaten ödül almış, çık.

  // 2. Kullanıcıya Puan Ver (Örn: 50 Puan - Baya değerli olsun)
  const { error } = await supabase.rpc('increment_user_points', { 
    u_id: userId, 
    points: 50 
  });

  if (!error) {
    // 3. Bildirim Gönder
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'ai_reference',
      title: '🤖 Cevabın Yapay Zeka Tarafından Seçildi!',
      content: 'Tebrikler! Yazdığın cevap o kadar kaliteliydi ki, yapay zeka benzer bir soruda senin cevabını referans gösterdi. +50 Puan kazandın!',
      link: `/questions/${questionId}`
    });
    
    // Kayıt tut (Log)
    await supabase.from('user_rewards').insert({
      user_id: userId,
      reason: 'ai_reference',
      reference_id: questionId,
      points: 50
    });
  }
}