import { createClient } from '@/utils/supabase/server';
import { generateAILegalNote } from '@/utils/ai-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { questionId, title, content } = await request.json();
    const supabase = await createClient();

    // 1. Gemini ile Analiz Üret
    const aiResponse = await generateAILegalNote(title, content);

    // 2. Veritabanını Güncelle
    const { error } = await supabase
      .from('questions')
      .update({ ai_response: aiResponse })
      .eq('id', questionId);

    if (error) {
      console.error('Veritabanı güncelleme hatası:', error);
      return NextResponse.json({ error: 'DB Hatası' }, { status: 500 });
    }

    // 3. Sonucu sayfaya döndür
    return NextResponse.json({ ai_response: aiResponse });

  } catch (error) {
    console.error('AI API Hatası:', error);
    return NextResponse.json({ error: 'Sunucu Hatası' }, { status: 500 });
  }
}