'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
// import { redirect } from "next/navigation"; // <-- ARTIK KULLANMIYORUZ
import { checkContentSafety, generateEmbedding } from "./ai-engine"; 

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  // 1. Verileri Al
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const target = formData.get('target') as string; 
  const category = formData.get('category') as string;
  const tags = formData.get('tags') as string;

  if (!title || !content) {
    return { error: 'Başlık ve içerik zorunludur.' };
  }

  // 2. Kullanıcı Kontrolü
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Kullanıcı girişi yapılmamış.' };

  // 3. Güvenlik Kontrolü
  const safetyCheck = await checkContentSafety(`${title}\n${content}`);
  if (!safetyCheck.isSafe) {
    return { error: safetyCheck.reason || "Güvenlik politikası ihlali." };
  }

  // 4. Kredi Kontrolü ve Düşme
  const SORU_UCRETI = target === 'ai' ? 3 : 1;
  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
  
  if (!profile || profile.credits < SORU_UCRETI) {
    return { error: `Yetersiz kredi (${SORU_UCRETI} gerekli).` };
  }

  const { error: creditError } = await supabase
    .from('profiles')
    .update({ credits: profile.credits - SORU_UCRETI })
    .eq('id', user.id);

  if (creditError) return { error: 'Kredi işlemi sırasında hata oluştu.' };

  // 5. Embedding (Hata Toleranslı)
  let embedding = null;
  try {
    const textForEmbedding = `${category || ''} ${title} ${content}`.trim().replace(/\n/g, " ");
    embedding = await generateEmbedding(textForEmbedding);
  } catch (e) {
    console.warn("⚠️ Vektör oluşturulamadı (Soru yine de kaydedilecek):", e);
  }

  // 6. VERİTABANINA KAYIT
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      category,
      user_id: user.id,
      embedding: embedding,
      // AI ise 'analyzing', Topluluk ise 'approved'
      status: target === 'ai' ? 'analyzing' : 'approved',
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();

  // HATA YÖNETİMİ (ROLLBACK)
  if (questionError) {
    console.error("Soru kayıt hatası:", questionError);
    await supabase.from('profiles').update({ credits: profile.credits }).eq('id', user.id);
    return { error: "Bir sorun oluştu. Krediniz iade edildi." };
  }

  // Cache temizliği
  revalidatePath('/questions');
  revalidatePath('/dashboard');
  
  // redirect() KULLANMIYORUZ. ID'yi client'a geri gönderiyoruz.
  return { 
    success: true, 
    questionId: questionData.id,
    target: target 
  };
}