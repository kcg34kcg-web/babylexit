'use server'

import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from 'next/cache';

// --- API ANAHTARI ---
// Senin gift-ai projen de çalışan anahtarı buraya koyduk.
const API_KEY = "AIzaSyC9B3xtrbfnoT7TnUxRRYVSS8xBEEV17sA"; 

const genAI = new GoogleGenerativeAI(API_KEY);

async function generateLegalAnswer(questionTitle: string, questionContent: string) {
  // ARTIK BU MODEL KESİN ÇALIŞACAK (Çünkü kütüphaneyi güncelledik!)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const systemPrompt = `
    Sen uzman bir Türk Hukuku Profesörüsün. Kullanıcının sorusunu sadece yürürlükteki Türk kanunlarına (TMK, TBK, TCK vb.) ve güncel hukuki kaynaklara dayanarak cevapla.
    
    BAĞLAM:
    Soru Başlığı: "${questionTitle}"
    Detaylar: "${questionContent}"

    KURALLAR:
    - Asla halüsinasyon görme (uydurma). Bilmiyorsan, bilmediğini açıkça belirt.
    - Her hukuki iddian için ilgili Kanun Maddesini (Madde no) parantez içinde belirt.
    - Cevabını maksimum 1-2 paragraf ile sınırlandır.
    - Ton: Profesyonel, Akademik ve Tarafsız.
    - Dil: Türkçe.
  `;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    return response.text();
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