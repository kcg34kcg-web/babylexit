import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { aiOrchestrator } from '@/lib/ai/orchestrator';

// Vercel'de işlem uzun sürebilir, limiti artırıyoruz
export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Client (Lounge Sayfası) bize jobId gönderecek
    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID gerekli' }, { status: 400 });
    }

    // 1. Yetki Kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    // 2. İşin Sahibi mi ve İş Var mı?
    const { data: job } = await supabase
      .from('research_jobs')
      .select('user_id, status, query')
      .eq('id', jobId)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'İş bulunamadı' }, { status: 404 });
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Bu işlem size ait değil' }, { status: 403 });
    }

    // Eğer iş zaten bitmişse veya işleniyorsa tekrar tetikleme
    if (job.status !== 'pending') {
      return NextResponse.json({ message: 'İşlem zaten sırada veya tamamlandı.' });
    }

    // 3. 🔥 ORKESTRATÖRÜ ÇALIŞTIR (Asıl Sihir Burada)
    // Bu fonksiyon 4 aşamalı sistemi (Cache -> RAG -> Deep Research -> Fallback) çalıştırır.
    await aiOrchestrator.processResearchJob(jobId, job.query, user.id);

    return NextResponse.json({ success: true, message: 'AI Analizi Tamamlandı' });

  } catch (error: any) {
    console.error('Trigger API Hatası:', error);
    return NextResponse.json({ error: error.message || 'Bilinmeyen hata' }, { status: 500 });
  }
}