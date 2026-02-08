import { createClient } from '@/utils/supabase/server';
import { generateSmartAnswer } from '@/app/actions/ai-engine'; 
import { NextResponse } from 'next/server';

// Vercel/Node ortamında zaman aşımını uzatıyoruz (Standart 10sn yetmeyebilir)
export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    const { questionId } = await request.json();
    
    if (!questionId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const supabase = await createClient();
    
    // 1. Soruyu Çek
    const { data: question } = await supabase
        .from('questions')
        .select('title, content, status')
        .eq('id', questionId)
        .single();
    
    if (!question) return NextResponse.json({ error: 'Soru bulunamadı' }, { status: 404 });

    // Eğer zaten cevaplanmışsa tekrar çalıştırma (Safety)
    if (question.status === 'answered') {
        return NextResponse.json({ message: 'Zaten işlenmiş.' });
    }

    console.log(`🤖 AI Analizi Başlıyor ID: ${questionId}`);

    // 2. AI Motorunu Çalıştır (Bu işlem 15-20sn sürebilir)
    const aiResponse = await generateSmartAnswer(question.title, question.content);

    // 3. Sonucu Yaz
    const { error } = await supabase
      .from('questions')
      .update({ 
          ai_response: aiResponse,
          status: 'answered' // Lounge sayfası bu statü değişimini dinleyecek
      })
      .eq('id', questionId);

    if (error) {
        console.error("DB Update Hatası:", error);
        throw error;
    }

    console.log(`✅ AI Analizi Tamamlandı ID: ${questionId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("AI Trigger Kritik Hata:", error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}