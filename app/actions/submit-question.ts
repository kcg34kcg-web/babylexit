'use server'

import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Google Gemini API Kurulumu
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateLegalAnswer(questionTitle: string, questionContent: string) {
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
    return result.response.text();
  } catch (error) {
    console.error("AI Üretim Hatası:", error);
    return "Şu anda yapay zeka hukuk görüşü oluşturulamadı. Lütfen topluluk cevaplarını bekleyiniz.";
  }
}

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  
  // 1. Kullanıcıyı Doğrula
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Giriş yapmamışsa login sayfasına atabiliriz veya hata dönebiliriz
    redirect('/login');
  }

  // 2. Soruyu Kaydet
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      user_id: user.id
    })
    .select()
    .single();

  if (questionError) throw new Error(questionError.message);

  // 3. AI Cevabını Üret (Gemini Çağrısı)
  const aiResponseContent = await generateLegalAnswer(title, content);

  // 4. AI Cevabını Kaydet
  // ÖNEMLİ: 'is_ai_generated: true' olarak işaretliyoruz.
  // user_id olarak şu anki kullanıcıyı veriyoruz, ancak frontend'de 'is_ai_generated' 
  // true olduğu için kullanıcı adı yerine "Babylexit AI" görünecek.
  await supabase
    .from('answers')
    .insert({
      question_id: questionData.id,
      user_id: user.id, 
      content: aiResponseContent,
      is_ai_generated: true, // <--- BU SATIR ÇOK ÖNEMLİ
      is_verified: true
    });

  // 5. Yönlendirme ve Yenileme
  revalidatePath('/questions'); // Listeyi yenile
  redirect(`/questions/${questionData.id}`); // Detay sayfasına git
}