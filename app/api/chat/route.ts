import { aiOrchestrator } from '@/lib/ai/orchestrator';

// Vercel'de fonksiyonun maksimum çalışma süresini 60 saniye yapıyoruz
export const maxDuration = 60; 

export async function POST(req: Request) {
  let jsonBody;
  try {
    jsonBody = await req.json();
  } catch (e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages } = jsonBody;
  // Kullanıcının son mesajını (sorusunu) alıyoruz
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content;

  // --- 1. AŞAMA: YENİ PYTHON BACKEND (ÖNCELİKLİ) ---
  try {
    console.log("🐍 Python Backend'e soruluyor:", query);
    
    const pythonResponse = await fetch('http://127.0.0.1:8000/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query }),
      // HATA 1 DÜZELTİLDİ: Süreyi 5 saniyeden 60 saniyeye çıkardık.
      signal: AbortSignal.timeout(60000) 
    });

    if (pythonResponse.ok) {
      const data = await pythonResponse.json();
      const pythonAnswer = data.cached_response;

      if (pythonAnswer) {
        console.log("✅ Cevap Python Backend'den döndü.");

        // --- HATA 2 DÜZELTİLDİ: STREAM PROTOKOLÜ ---
        // Frontend'in (useChat) anlayacağı formata çeviriyoruz: '0:"mesaj"\n'
        
        // 1. Cevabı güvenli bir JSON stringine çevir (Tırnak işaretlerini bozulmadan saklar)
        const encodedAnswer = JSON.stringify(pythonAnswer);
        
        // 2. SDK Protokolü: '0:' öneki + string veri + '\n' satır sonu
        const streamData = `0:${encodedAnswer}\n`;

        const stream = new ReadableStream({
          start(controller) {
            // Düz metni DEĞİL, bu özel formatlı veriyi gönderiyoruz
            controller.enqueue(new TextEncoder().encode(streamData));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { 
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Vercel-AI-Data-Stream': 'true' 
          },
        });
      }
    } else {
        console.warn(`Python Backend Hatası: ${pythonResponse.status}`);
    }
  } catch (error) {
    console.warn("⚠️ Python Backend erişilemedi veya zaman aşımı, Fallback devreye giriyor:", error);
  }

  // --- 2. AŞAMA: FALLBACK (ESKİ SİSTEM - YEDEK) ---
  // Eğer Python backend kapalıysa veya hata verdiyse burası çalışır.
  try {
    const history = messages.slice(0, -1);
    const result = await aiOrchestrator.generateResponse(query, history);

    console.log("🔄 Cevap aiOrchestrator (Eski Sistem) tarafından üretildi.");
    
    // (result as any) kullanarak TypeScript hatasını bypass ediyoruz.
    return (result as any).toDataStreamResponse();

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}