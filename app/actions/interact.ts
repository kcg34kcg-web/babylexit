'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Mevcut fonksiyonun (Dokunmuyoruz, aynen kalıyor)
export async function handleInteraction(
  postId: string, 
  authorId: string, 
  action: 'not_interested' | 'mute' | 'block'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (action === 'not_interested') {
    const { data: post } = await supabase
        .from('posts')
        .select('category')
        .eq('id', postId)
        .single();
        
    if (post?.category) {
        await supabase.rpc('decrement_interest_vector', {
            user_id: user.id,
            category_key: post.category,
            amount: 2 
        });
    }
    await supabase.rpc('increment_doow', { post_id: postId });
  }

  if (action === 'block') {
    await supabase.from('blocks').insert({
        blocker_id: user.id,
        blocked_id: authorId
    });
  }

  if (action === 'mute') {
     await supabase.from('mutes').insert({
        muter_id: user.id,
        muted_id: authorId
    });
  }
}

// --- YENİ EKLENEN REAKSİYON FONKSİYONU ---
// Woow, Doow, Adil reaksiyonlarını yönetir ve sayfayı yenileyince silinmemesini sağlar.
export async function toggleReaction(postId: string, reactionType: 'woow' | 'doow' | 'adil') {
  const supabase = await createClient(); // Senin server.ts dosyana göre await ŞARTTIR.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız" };

  try {
    // 1. Önce bu kullanıcı bu posta daha önce reaksiyon vermiş mi bakalım
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id, reaction_type')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // A) Aynı tuşa tekrar bastı -> Geri al (Sil)
        await supabase.from('post_reactions').delete().eq('id', existing.id);
      } else {
        // B) Farklı tuşa bastı -> Güncelle (Örn: Woow idi, Doow yaptı)
        await supabase
          .from('post_reactions')
          .update({ reaction_type: reactionType, created_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } else {
      // C) Hiç reaksiyonu yok -> Yeni ekle
      await supabase.from('post_reactions').insert({
        user_id: user.id,
        post_id: postId,
        reaction_type: reactionType
      });
    }

    // Cache temizleme: Sayfa yenilendiğinde güncel veriyi görsün diye
    // Eğer bu yollar projenizde yoksa hata vermez, sadece cache yenilenmez.
    revalidatePath('/main'); 
    revalidatePath(`/questions/${postId}`); 
    
    return { success: true };
  } catch (error) {
    console.error("Reaction Error:", error);
    return { error: "İşlem başarısız" };
  }
}