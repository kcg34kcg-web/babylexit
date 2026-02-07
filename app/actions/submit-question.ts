'use server';

import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from "@google/genai"; 
import { revalidatePath } from 'next/cache';
import { checkContentSafety } from "./ai-engine"; 

const API_KEY = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- YARDIMCI: Embedding Oluşturma (Hazırda dursun, ileride kullanacağız) ---
async function generateEmbedding(text: string) {
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: [{ parts: [{ text: text }] }]
    });
    return response.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error("Embedding Hatası:", error);
    return null; 
  }
}

// --- ANA FONKSİYON: Soru Gönderme ---
export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const target = formData.get('target') as string;
  // const topicId = formData.get('topic_id') as string; // VERİTABANINDA YOKSA KAPAT

  if (!title || !content) {
    return { error: 'Başlık ve içerik zorunludur.' };
  }

  // 1. Kullanıcı Kontrolü
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Kullanıcı girişi yapılmamış.' };
  }

  // 2. Güvenlik Kontrolü
  const safetyCheck = await checkContentSafety(`${title}\n${content}`);
  if (!safetyCheck.isSafe) {
    return { error: safetyCheck.reason || "Güvenlik politikası ihlali." };
  }

  // 3. Kredi Kontrolü
  const SORU_UCRETI = target === 'ai' ? 3 : 1;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return { error: 'Profil bulunamadı.' };
  if (profile.credits < SORU_UCRETI) return { error: `Yetersiz kredi (${SORU_UCRETI} gerekli).` };

  // 4. Kredi Düşme
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: profile.credits - SORU_UCRETI })
    .eq('id', user.id);

  if (updateError) {
    return { error: 'Kredi düşülürken hata oluştu.' };
  }

  // 5. Embedding (Oluşturalım ama şimdilik kaydetmeyelim)
  const textForEmbedding = `${title} ${content.substring(0, 200)}`.replace(/\n/g, " ");
  await generateEmbedding(textForEmbedding);

  // 6. SORUYU KAYDET (GÜVENLİ INSERT) ✅
  // HATA ÇÖZÜMÜ BURADA: Veritabanında kesin olan alanları kullanıyoruz.
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      user_id: user.id,
      // topic_id: topicId,      <-- KAPATILDI (DB'de yoksa hata verir)
      // asked_to_ai: target === 'ai', <-- KAPATILDI (DB'de yoksa hata verir)
      // embedding: embedding,   <-- KAPATILDI (DB'de yoksa hata verir)
      status: target === 'ai' ? 'analyzing' : 'approved',
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (questionError) {
    console.error("Soru kayıt hatası:", questionError);
    // Hata durumunda krediyi iade et
    await supabase.from('profiles').update({ credits: profile.credits }).eq('id', user.id);
    return { error: "Veritabanı hatası: Soru kaydedilemedi. (Sütun eksikliği olabilir)" };
  }

  // Başarılı
  revalidatePath('/questions');
  revalidatePath('/dashboard');
  
  return { 
    success: true, 
    questionId: questionData.id, 
    newCredits: profile.credits - SORU_UCRETI,
    targetUsed: target 
  };
}