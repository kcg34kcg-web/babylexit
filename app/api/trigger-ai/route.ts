import { createClient } from '@/utils/supabase/server';
import { generateSmartAnswer } from '@/app/actions/ai-engine'; 
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Bu endpoint, frontend'den "Lounge yüklendi" sinyali gelince çalışır.
  try {
    const { questionId } = await request.json();
    
    if (!questionId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const supabase = await createClient();
    
    // 1. Soruyu Çek
    const { data: question } = await supabase
        .from('questions')
        .select('title, content')
        .eq('id', questionId)
        .single();
    
    if (!question) return NextResponse.json({ error: 'Soru bulunamadı' }, { status: 404 });

    // 2. AI Motorunu Çalıştır (Bu işlem 5-15 saniye sürebilir)
    // Next.js App Router'da response'u beklemeden işlemi sürdürmek için
    // idealde "waitUntil" veya background job kullanılır ama
    // şimdilik basit await ile yapıyoruz, çünkü istemci (Lounge) zaten cevabı beklemiyor.
    const aiResponse = await generateSmartAnswer(question.title, question.content);

    // 3. Cevabı Veritabanına Yaz ve Durumu Güncelle
    const { error } = await supabase
      .from('questions')
      .update({ 
          ai_response: aiResponse,
          status: 'answered' 
      })
      .eq('id', questionId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("AI Trigger Hatası:", error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}