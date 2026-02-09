'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Derin Araştırma (Aşama 4) Tetikleyicisi
 * * Bu fonksiyon, yapay zekanın cevap veremediği durumlarda çağrılır.
 * 1. Kullanıcının oturumunu kontrol eder.
 * 2. Supabase 'research_jobs' tablosuna 'pending' durumunda yeni bir iş açar.
 * 3. Oluşan işin ID'sini döner (Böylece kullanıcıyı Lounge'a yönlendirebiliriz).
 */
export async function startDeepResearch(query: string) {
  try {
    const supabase = await createClient()

    // 1. Güvenlik Kontrolü: Kullanıcı giriş yapmış mı?
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { 
        success: false, 
        error: 'Derin araştırma özelliğini kullanmak için giriş yapmalısınız.' 
      }
    }

    // 2. İşi Hafızaya (Veritabanına) Kaydet
    // Python servisi bu tabloyu dinleyip işi buradan alacak.
    const { data, error } = await supabase
      .from('research_jobs')
      .insert({
        user_id: user.id,
        query: query,
        status: 'pending', // İş sıraya alındı
        result: null,
        sources: []
      })
      .select('id') // Bize oluşan ID lazım (Lounge URL'i için)
      .single()

    if (error) {
      console.error('Derin Araştırma Kayıt Hatası:', error)
      return { 
        success: false, 
        error: 'Araştırma başlatılamadı. Sistem yoğun olabilir.' 
      }
    }

    console.log(`🚀 [Deep Research] Yeni Görev Başlatıldı. JobID: ${data.id}`)
    
    // 3. Başarılı! ID'yi dön.
    return { success: true, jobId: data.id }

  } catch (err) {
    console.error('Deep Research Kritik Hata:', err)
    return { success: false, error: 'Bilinmeyen bir hata oluştu.' }
  }
}