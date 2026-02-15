'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Python Backend URL'i (Env dosyasında yoksa varsayılanı kullanır)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient()

  // 1. Verileri Al
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const target = formData.get('target') as string // 'ai' veya 'community'
  const category = formData.get('category') as string

  // Kullanıcı Kontrolü
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Giriş yapmalısınız.' }

  try {
    // ---------------------------------------------------------
    // ADIM 2: Soruyu Supabase'e Kaydet
    // ---------------------------------------------------------
    const { data: questionData, error: qError } = await supabase
      .from('questions')
      .insert({
        title, 
        content, 
        category_id: category, 
        user_id: user.id,
        // Eğer hedef AI ise durumu 'analyzing' yapıyoruz
        status: target === 'ai' ? 'analyzing' : 'approved' 
      })
      .select('id')
      .single()

    if (qError) throw qError
    if (!questionData) throw new Error('Soru ID alınamadı.');

    let researchJobId = null

    // ---------------------------------------------------------
    // ADIM 3: Hedef AI ise İşlemleri Başlat
    // ---------------------------------------------------------
    if (target === 'ai') {
      
      // A. Lounge (Research Jobs) Kaydı Oluştur (Senin mevcut kodun)
      const { data: jobData, error: jobError } = await supabase
        .from('research_jobs')
        .insert({
          user_id: user.id,
          query: `${title}\n\n${content}`,
          status: 'pending',
          sources: { question_id: questionData.id } // JSONB formatında ilişki
        })
        .select('id')
        .single()

      if (!jobError && jobData) {
        researchJobId = jobData.id
      }

      // B. PYTHON AI MOTORUNU TETİKLE (YENİ EKLENEN KISIM) 🚀
      // Hata alsa bile işlemi durdurmuyoruz (Fire-and-forget mantığına yakın)
      try {
        console.log(`📡 AI Tetikleniyor: ${questionData.id}`);
        await fetch(`${PYTHON_SERVICE_URL}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question_id: questionData.id }),
        });
      } catch (aiError) {
        console.error("⚠️ AI Motoru Tetiklenemedi:", aiError);
        // Kritik hata değil, kullanıcıya "başarılı" dönebiliriz, arka planda worker tekrar deneyebilir.
      }
    }

    // ---------------------------------------------------------
    // ADIM 4: Sonuç Dönüşü
    // ---------------------------------------------------------
    revalidatePath('/questions')
    
    // Client tarafına JSON dönüyoruz (Redirect yok)
    return { 
        success: true, 
        target: target,
        questionId: questionData.id,
        jobId: researchJobId 
    }

  } catch (error: any) {
    console.error("Submit Question Hatası:", error)
    return { success: false, error: "İşlem başarısız: " + (error.message || error) }
  }
}