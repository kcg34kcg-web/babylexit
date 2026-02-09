'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkContentSafety, generateEmbedding } from "./ai-engine"; 

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  // 1. Verileri Al
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const target = formData.get('target') as string; // 'ai' veya 'community'
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

  // 4. Kredi Kontrolü
  const SORU_UCRETI = target === 'ai' ? 3 : 1;
  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
  
  if (!profile || profile.credits < SORU_UCRETI) {
    return { error: `Yetersiz kredi (${SORU_UCRETI} gerekli).` };
  }

  // Krediyi düş
  const { error: creditError } = await supabase
    .from('profiles')
    .update({ credits: profile.credits - SORU_UCRETI })
    .eq('id', user.id);

  if (creditError) return { error: 'Kredi işlemi sırasında hata oluştu.' };

  // 5. Embedding (Vektör Oluşturma - Stage 1/2 Hazırlığı)
  let embedding = null;
  try {
    const textForEmbedding = `${category || ''} ${title} ${content}`.trim().replace(/\n/g, " ");
    embedding = await generateEmbedding(textForEmbedding);
  } catch (e) {
    console.warn("⚠️ Vektör oluşturulamadı (Soru yine de kaydedilecek):", e);
  }

  // 6. SORUYU KAYDET (Kalıcı Hafıza - Questions Tablosu)
  // Burası değişmedi, soru her zaman buraya girmeli.
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
    // Soruyu kaydedemediysek krediyi iade et
    await supabase.from('profiles').update({ credits: profile.credits }).eq('id', user.id);
    return { error: "Bir sorun oluştu. Krediniz iade edildi." };
  }

  // ============================================================
  // 🚀 7. [YENİ] 4 AŞAMALI SİSTEM TETİKLEYİCİSİ
  // Eğer hedef yapay zeka ise, "Research Job" oluşturuyoruz.
  // ============================================================
  
  let researchJobId = null;

  if (target === 'ai') {
    // Soru başlığı ve içeriğini birleştirip arama sorgusu yapıyoruz
    const fullQuery = `${title}. ${content}`;

    const { data: jobData, error: jobError } = await supabase
      .from('research_jobs')
      .insert({
        user_id: user.id,
        query: fullQuery,
        status: 'pending', // Lounge beklemeye başlayacak
        result: null,      // Henüz sonuç yok
        sources: []
        // Not: İleride buraya 'question_id' ekleyip ilişki kurabiliriz.
        // Şimdilik sonucu Client üzerinden eşleştireceğiz.
      })
      .select('id')
      .single();

    if (jobError) {
      console.error("❌ Research Job Oluşturulamadı:", jobError);
      // Kritik hata değil, soru kaydedildi ama job oluşmadı.
      // Bu durumda kullanıcıyı Lounge yerine klasik sayfaya atarız.
    } else {
      researchJobId = jobData.id;
      console.log(`✅ [Deep Research] Job Başlatıldı: ${researchJobId}`);
    }
  }

  // 8. Cache Temizliği
  revalidatePath('/questions');
  revalidatePath('/dashboard');
  
  // 9. SONUÇ DÖNÜŞÜ
  // Client tarafı (ask/page.tsx) bu cevabı bekliyor.
  return { 
    success: true, 
    questionId: questionData.id,
    target: target,
    jobId: researchJobId // NULL ise normal akış, DOLU ise Lounge'a git
  };
}