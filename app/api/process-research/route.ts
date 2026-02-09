import { aiOrchestrator } from '@/lib/ai/orchestrator';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { jobId } = await req.json();
  const supabase = await createClient();

  try {
    console.log(`🚀 Lounge Tetiklendi: Job ${jobId} işleniyor...`);

    // 1. İşi Çek
    const { data: job } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) return NextResponse.json({ error: 'İş bulunamadı' }, { status: 404 });

    // 2. Durumu 'processing' yap
    await supabase.from('research_jobs').update({ status: 'processing' }).eq('id', jobId);

    // 3. BEYNİ ÇALIŞTIR (Orkestratör)
    // generateStaticResponse fonksiyonunu kullanıyoruz
    const aiResultText = await aiOrchestrator.generateStaticResponse(job.query);

    // 4. Sonucu Kaydet (Hem Job'a hem Answer'a)
    
    // A) Job'ı güncelle (Lounge tamamlandı görsün diye)
    await supabase.from('research_jobs').update({
        status: 'completed',
        result: aiResultText,
        updated_at: new Date().toISOString()
    }).eq('id', jobId);

    // B) Asıl Soruya Cevap Olarak Ekle
    // Not: submit-question.ts'de question_id'yi sources içine saklamıştık.
    const questionId = job.sources?.[0]?.question_id;
    
    if (questionId) {
        await supabase.from('answers').insert({
            question_id: questionId,
            user_id: job.user_id, // veya AI User ID
            content: aiResultText,
            is_accepted: false,
            metadata: { source: 'lounge_deep_research' }
        });
        
        // Sorunun durumunu güncelle
        await supabase.from('questions').update({ status: 'answered' }).eq('id', questionId);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Lounge Process Error:", error);
    await supabase.from('research_jobs').update({ status: 'failed' }).eq('id', jobId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}