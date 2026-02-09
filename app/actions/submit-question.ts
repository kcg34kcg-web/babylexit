'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
// import { redirect } from 'next/navigation' <--- BUNU SİLİYORUZ (Redirect'i client yapacak)

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient()

  // 1. Verileri Al
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const target = formData.get('target') as string
  const category = formData.get('category') as string

  // ... (Kullanıcı ve Kredi kontrolleri aynı kalsın) ...
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }
  
  // (Burada kredi düşme kodların kalsın)

  try {
    // 2. Soruyu Kaydet
    const { data: questionData, error: qError } = await supabase
      .from('questions')
      .insert({
        title, content, category_id: category, user_id: user.id,
        status: target === 'ai' ? 'analyzing' : 'approved'
      })
      .select('id').single()

    if (qError) throw qError

    let researchJobId = null

    // 3. Lounge İçin Job Oluştur (AI ise)
    if (target === 'ai') {
      const { data: jobData, error: jobError } = await supabase
        .from('research_jobs')
        .insert({
          user_id: user.id,
          query: `${title}\n\n${content}`,
          status: 'pending',
          sources: [{ question_id: questionData.id }] // İlişkiyi burada tutuyoruz
        })
        .select('id').single()

      if (!jobError) {
        researchJobId = jobData.id
      }
    }

    revalidatePath('/questions')
    
    // 4. KRİTİK DÖNÜŞ: Redirect yapmadan veriyi Client'a atıyoruz.
    return { 
        success: true, 
        target: target,
        questionId: questionData.id,
        jobId: researchJobId // <--- Client bunu görünce Lounge'a gidecek
    }

  } catch (error: any) {
    console.error("Hata:", error)
    return { error: "İşlem başarısız: " + error.message }
  }
  
  // DİKKAT: Buradaki redirect() fonksiyonunu sildik.
}