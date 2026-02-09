'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// import { checkContentSafety, generateEmbedding } from "./ai-engine"; // Varsa açabilirsin

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient()

  // 1. Verileri Al
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const target = formData.get('target') as string // 'ai' veya 'community'
  const category = formData.get('category') as string

  // 2. Kullanıcı Kontrolü
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // 3. Kredi Kontrolü (Senin mevcut yapın)
  const SORU_UCRETI = target === 'ai' ? 3 : 1
  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
  
  if (!profile || profile.credits < SORU_UCRETI) {
    return { error: `Yetersiz kredi (${SORU_UCRETI} gerekli).` }
  }

  // Krediyi düş
  await supabase.from('profiles').update({ credits: profile.credits - SORU_UCRETI }).eq('id', user.id)

  try {
    // 4. Soruyu Kaydet
    const { data: questionData, error: qError } = await supabase
      .from('questions')
      .insert({
        title, content, category_id: category, user_id: user.id,
        status: target === 'ai' ? 'analyzing' : 'approved'
      })
      .select('id').single()

    if (qError) throw qError

    let researchJobId = null

    // --- LOUNGE ENTEGRASYONU ---
    if (target === 'ai') {
      // Cevabı BURADA üretmiyoruz. Sadece "İş Emri" açıyoruz.
      const { data: jobData, error: jobError } = await supabase
        .from('research_jobs')
        .insert({
          user_id: user.id,
          query: `${title}\n\n${content}`,
          status: 'pending', // Bekliyor...
          // Bu işin hangi soruya ait olduğunu bilmemiz lazım, 
          // research_jobs tablosuna 'question_id' sütunu eklemen iyi olur.
          // Şimdilik 'sources' alanına veya metadata'ya hackleyebiliriz ama doğrusu sütun eklemektir.
          // Geçici çözüm: query içine ID gömmek veya tabloya alan eklemek.
          // Varsayım: research_jobs tablosunda metadata veya question_id var.
          // Yoksa sources jsonb alanını kullanalım:
          sources: [{ type: 'meta', question_id: questionData.id }] 
        })
        .select('id').single()

      if (!jobError) {
        researchJobId = jobData.id
      }
    }

    revalidatePath('/questions')
    
    // 5. SONUÇ: Eğer AI ise JobID dön (Client, Lounge'a yönlendirecek)
    return { 
        success: true, 
        target: target,
        questionId: questionData.id,
        jobId: researchJobId // <--- Bu dolu gelirse Client Lounge'a atar
    }

  } catch (error: any) {
    console.error("Hata:", error)
    return { error: "İşlem başarısız." }
  }
}