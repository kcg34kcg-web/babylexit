'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Dosya Yükleme (Katman 2 - Python Worker İçin)
 * Bu fonksiyon dosyayı Storage'a yükler ve Python'un dinlediği kuyruğa ekler.
 */
export async function uploadFileForAnalysis(formData: FormData) {
  const supabase = await createClient()

  // 1. Yetki Kontrolü
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Oturum açmanız gerekiyor.' }
  }

  // 2. Dosyayı Al
  const file = formData.get('file') as File
  if (!file) {
    return { success: false, error: 'Dosya seçilmedi.' }
  }

  // Boyut Kontrolü (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'Dosya boyutu 10MB sınırını aşıyor.' }
  }

  try {
    // 3. Dosya Adını Güvenli Hale Getir
    // Türkçe karakterleri ve boşlukları temizle
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
    const filePath = `${user.id}/${Date.now()}-${cleanName}`

    // 4. Supabase Storage'a Yükle ('raw_uploads' bucket)
    const { error: uploadError } = await supabase
      .storage
      .from('raw_uploads')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError)
      return { success: false, error: 'Dosya yüklenirken hata oluştu.' }
    }

    // 5. İş Kuyruğuna Ekle (Python Worker bunu görecek)
    const { error: dbError } = await supabase
      .from('file_processing_queue')
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_type: file.type,
        status: 'pending' // Python bunu işleyip 'completed' yapacak
      })

    if (dbError) {
      console.error('Queue Error:', dbError)
      return { success: false, error: 'İş kuyruğuna eklenemedi.' }
    }

    revalidatePath('/my-content')
    return { success: true, message: 'Dosya analize gönderildi.' }

  } catch (error: any) {
    console.error('Upload Action Error:', error)
    return { success: false, error: 'Beklenmeyen bir hata oluştu.' }
  }
}