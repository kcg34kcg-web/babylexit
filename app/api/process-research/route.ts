// app/api/process-research/route.ts
import { createClient } from '@/utils/supabase/server';
import { googleSearch } from '@/lib/search-service';
import { scrapeAndClean } from '@/lib/scraper';
import { aiOrchestrator } from '@/lib/ai/orchestrator';
import { generateEmbedding } from '@/app/actions/ai-engine'; // Embedding fonksiyonun (var olduğunu varsayıyorum)
import { chunkText } from '@/utils/rag-chunking';

export async function POST(req: Request) {
  const { jobId } = await req.json();
  const supabase = await createClient();

  // 1. İşi Al (Locking mechanism gerekebilir ama şimdilik basit tutalım)
  const { data: job } = await supabase
    .from('research_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job || job.status !== 'pending') {
    return Response.json({ message: 'İş bulunamadı veya zaten tamamlandı' });
  }

  try {
    // Durumu güncelle: "Araştırılıyor..."
    await supabase.from('research_jobs').update({ status: 'searching' }).eq('id', jobId);

    // 2. Arama Yap
    const urls = await googleSearch(job.query);
    console.log("Bulunan Kaynaklar:", urls);

    // 3. Oku ve Temizle
    await supabase.from('research_jobs').update({ status: 'reading' }).eq('id', jobId);
    const articles = await scrapeAndClean(urls);

    let fullContext = "";
    let savedChunkCount = 0;

    // 4. Kalıcı Hafızaya Kaydet (Pipeline'ın en değerli kısmı)
    for (const article of articles) {
      // Metni parçalara böl (Header-Aware Chunking - rag-chunking.ts kullanıyoruz)
      const chunks = chunkText(article.content, 800, 100);

      for (const chunk of chunks) {
         // Vektör üret
         const vector = await generateEmbedding(chunk);
         
         if (vector) {
            // Veritabanına göm (CulturaX mantığı: Bir daha arama yapmak zorunda kalma)
            await supabase.from('documents').insert({
               content: chunk,
               metadata: { url: article.url, title: article.title, type: 'web-research' },
               embedding: vector
            });
            savedChunkCount++;
         }
         
         // LLM Context'i için biriktir (Token limitine dikkat ederek)
         if (fullContext.length < 15000) {
            fullContext += `\n---\nKaynak: [${article.title}](${article.url})\n${chunk}`;
         }
      }
    }

    // 5. Sentez ve Cevaplama (Groq/Qwen)
    await supabase.from('research_jobs').update({ status: 'synthesizing' }).eq('id', jobId);
    
    const systemPrompt = `Sen üst düzey bir araştırmacı asistanısın. 
    Aşağıdaki GÜNCEL web verilerini kullanarak kullanıcının sorusunu detaylıca cevapla.
    Her bilginin sonuna [1], [2] gibi kaynak numarası ekle.
    Cevabın sonunda kaynakçayı listele.
    Asla uydurma yapma, sadece verilen metne sadık kal.`;

    const aiResponse = await aiOrchestrator.getAnswer(job.query, fullContext);

    // 6. İşi Bitir
    await supabase.from('research_jobs').update({
      status: 'completed',
      result: aiResponse.content,
      sources: articles.map(a => ({ title: a.title, url: a.url }))
    }).eq('id', jobId);

    return Response.json({ success: true, chunksSaved: savedChunkCount });

  } catch (error: any) {
    console.error("Research Process Error:", error);
    await supabase.from('research_jobs').update({ 
        status: 'failed', 
        result: `Hata oluştu: ${error.message}` 
    }).eq('id', jobId);
    
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}