'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from "next/navigation"; 
// ai-engine.ts dosyasından güvenlik ve embedding fonksiyonlarını alıyoruz
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

  // 3. Güvenlik Kontrolü (Safety Check)
  // Bu aşama veritabanına ve krediye girmeden önce yapılmalı.
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

  // ---------------------------------------------------------
  // 5. Embedding (Vektör) Oluşturma (HATA TOLERANSLI)
  // ---------------------------------------------------------
  // AI servisi yanıt vermese bile soru kaydedilmeli.
  let embedding = null;
  try {
    // Başlık, içerik ve (varsa) kategoriyi birleştirip vektör yapıyoruz
    const textForEmbedding = `${category || ''} ${title} ${content}`.trim().replace(/\n/g, " ");
    embedding = await generateEmbedding(textForEmbedding);
  } catch (e) {
    console.warn("⚠️ Vektör oluşturulamadı (Soru yine de kaydedilecek):", e);
    // Embedding null kalacak, sistem durmayacak.
  }

  // ---------------------------------------------------------
  // 6. VERİTABANINA KAYIT
  // ---------------------------------------------------------
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      category,                // Kategori
      user_id: user.id,        // Tablonda 'author_id' ise burayı düzeltmeyi unutma!
      embedding: embedding,    // Vektör (Varsa dolu, yoksa null)
      status: target === 'ai' ? 'analyzing' : 'approved',
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();

  // --- HATA YÖNETİMİ (ROLLBACK) ---
  if (questionError) {
    console.error("Soru kayıt hatası:", questionError);
    
    // Veritabanına kayıt başarısız olursa krediyi İADE ET
    await supabase
      .from('profiles')
      .update({ credits: profile.credits }) // Eski krediye geri dön
      .eq('id', user.id);

    return { error: "Bir sorun oluştu. Krediniz iade edildi. Lütfen tekrar deneyin." };
  }

  // --- 7. ETİKET (TAG) İŞLEMLERİ ---
  if (tags && questionData) {
    // İleride etiketleri 'question_tags' tablosuna eklemek istersen burayı kullanabilirsin.
    // console.log("Etiketler:", tags);
  }

  // 8. BAŞARILI BİTİŞ VE YÖNLENDİRME
  revalidatePath('/questions');
  revalidatePath('/dashboard');
  
  // İşlem başarılı, kullanıcıyı soru sayfasına yönlendir.
  redirect(`/questions/${questionData.id}`);
}