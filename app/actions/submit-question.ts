'use server'

import { createClient } from '@/utils/supabase/server';
// DİKKAT: Bu kodun çalışması için terminalde: npm install @google/genai
import { GoogleGenAI } from "@google/genai"; 
import { revalidatePath } from 'next/cache';

const API_KEY = "AIzaSyCwOe4Hs1YcMw7sw79wceSyi91RE94u6P8"; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function generateLegalAnswer(questionTitle: string, questionContent: string) {
  // --- GÜNCELLENMİŞ PROMPT BURADA ---
  const systemPrompt = `
    ROL VE AMAÇ:
    Sen, Türk Hukuku konusunda uzmanlaşmış, titiz ve akademik bir Kıdemli Hukuk Asistanısın. Amacın, hukuk öğrencisi olan kullanıcıya, **sadece yürürlükteki** mevzuata dayanan, analitik hukuki değerlendirmeler sunmaktır.

    BAĞLAM (KULLANICI SORUSU):
    Soru Başlığı: "${questionTitle}"
    Detaylar: "${questionContent}"

    KRİTİK KURALLAR VE KISITLAMALAR:
    1. **GÜNCELLİK ESASI (EN ÖNEMLİ KURAL):** Yanıtlarını verirken **sadece şu an yürürlükte olan** kanunları ve Resmi Gazete'de yayımlanmış en güncel değişiklikleri esas al. Mülga (yürürlükten kalkmış) kanunlara veya maddelere (Örn: 818 sayılı BK veya 765 sayılı TCK) asla atıf yapma.
    
    2. Doğruluk ve Dürüstlük (Sıfır Halüsinasyon): Asla var olmayan bir kanun maddesi veya içtihat uydurma. Bilmiyorsan "Bu konuda güncel veri tabanımda net bilgi yok" de.
    
    3. Atıf Formatı: Her hukuki iddianı mevzuat dayanağı ile destekle. Atıfları şu formatta yap: [Kanun Adı, Madde No/Fıkra]. Örnek: (Türk Medeni Kanunu m. 2/1).
    
    4. Yanıtlama Metodolojisi (IRAC):
       - Hukuki sorunu tespit et.
       - İlgili **Yürürlükteki** Kanun Maddesini belirt.
       - Olayı madde ile ilişkilendir (Analiz).
       - Net bir sonuca bağla.
    
    5. Ton ve Üslup: Profesyonel, objektif, didaktik ve akademik Türkçe.
    
    6. Uzunluk: Maksimum 2 yoğun ve bilgi dolu paragraf.

    ÇIKTI FORMATI:
    Giriş ve bitiş nezaket cümlelerini atla. Doğrudan hukuki analize başla.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { 
          role: 'user', 
          parts: [{ text: systemPrompt }] 
        }
      ]
    });

    const textAnswer = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textAnswer) {
      throw new Error("Yapay zeka boş cevap döndürdü.");
    }

    return textAnswer; 

  } catch (error: any) {
    console.error("AI Model Hatası:", error);
    return `Yapay zeka servisine şu an ulaşılamıyor. (Hata: ${error.message})`;
  }
}

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Kullanıcı girişi yapılmamış.' };
  }

  // Soruyu Kaydet
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      user_id: user.id
    })
    .select()
    .single();

  if (questionError) {
    return { error: questionError.message };
  }

  // AI Cevabını Üret
  const aiResponseContent = await generateLegalAnswer(title, content);

  // AI Cevabını Kaydet
  await supabase
    .from('answers')
    .insert({
      question_id: questionData.id,
      user_id: user.id, 
      content: aiResponseContent,
      is_ai_generated: true,
      is_verified: true
    });

  revalidatePath('/questions');
  
  return { success: true, questionId: questionData.id };
}