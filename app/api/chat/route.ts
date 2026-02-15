import { aiOrchestrator } from '@/lib/ai/orchestrator';
import { askBabyLexitEngine } from '@/utils/python-bridge';

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
    
    // utils/python-bridge içindeki fonksiyonu çağırıyoruz
    const engineResponse = await askBabyLexitEngine(query);

    // Python tarafı başarılı bir cevap döndüyse (Hata rotasında değilse)
    if (engineResponse && engineResponse.route !== "ERROR") {
      console.log("✅ Cevap Python Backend'den döndü.");

      // --- SENİN ORİJİNAL STREAM PROTOKOLÜN ---
      let pythonAnswer = engineResponse.text;

      // Kaynak linklerini senin formatında metne ekliyoruz
      if (engineResponse.source_links && engineResponse.source_links.length > 0) {
        pythonAnswer += "\n\n**Kaynaklar:**\n" + engineResponse.source_links.map(link => `- ${link}`).join('\n');
      }

      // 1. Cevabı güvenli bir JSON stringine çevir (Tırnak işaretlerini korur)
      const encodedAnswer = JSON.stringify(pythonAnswer);
      
      // 2. SDK Protokolü: '0:' öneki + string veri + '\n' satır sonu
      const streamData = `0:${encodedAnswer}\n`;

      const stream = new ReadableStream({
        start(controller) {
          // Senin orijinal controller yapın
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
  } catch (error) {
    console.warn("⚠️ Python Backend erişilemedi veya zaman aşımı, Fallback devreye giriyor:", error);
  }

  // --- 2. AŞAMA: FALLBACK (ESKİ SİSTEM - YEDEK) ---
  // Python backend kapalıysa veya hata verdiyse burası çalışır (Orijinal Kodun).
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