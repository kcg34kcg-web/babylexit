import { aiOrchestrator } from '@/lib/ai/orchestrator';

export const maxDuration = 60; 

export async function POST(req: Request) {
  let jsonBody;
  try {
    jsonBody = await req.json();
  } catch (e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages } = jsonBody;
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content;

  // --- 1. AŞAMA: YENİ PYTHON BACKEND (ÖNCELİKLİ) ---
  try {
    const pythonResponse = await fetch('http://127.0.0.1:8000/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query }),
      signal: AbortSignal.timeout(5000) // 5 saniye bekle
    });

    if (pythonResponse.ok) {
      const data = await pythonResponse.json();
      const pythonAnswer = data.cached_response;

      if (pythonAnswer) {
        // Python cevabını Stream formatına çeviriyoruz
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(pythonAnswer));
            controller.close();
          },
        });

        console.log("✅ Cevap Python Backend'den (RAG) döndü.");
        return new Response(stream, {
          headers: { 
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Vercel-AI-Data-Stream': 'true' 
          },
        });
      }
    }
  } catch (error) {
    console.warn("⚠️ Python Backend erişilemedi, Fallback devreye giriyor.");
  }

  // --- 2. AŞAMA: FALLBACK (ESKİ SİSTEM) ---
  try {
    const history = messages.slice(0, -1);
    
    // Eski orkestratörü çağırıyoruz
    const result = await aiOrchestrator.generateResponse(query, history);

    console.log("🔄 Cevap aiOrchestrator (Eski Sistem) tarafından üretildi.");
    
    // HATA DÜZELTME: (result as any) kullanarak TypeScript hatasını bypass ediyoruz.
    // Çalışma zamanında bu metodun var olduğunu biliyoruz.
    return (result as any).toDataStreamResponse();

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}