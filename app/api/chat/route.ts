import { aiOrchestrator } from '@/lib/ai/orchestrator';

export const maxDuration = 60; // Süreyi biraz artırdık (Google araması vs. için)

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // 1. Kullanıcının son sorusunu al
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // 2. Geçmiş konuşmaları al (Bağlamı korumak için)
    // Orkestratöre göndermeden önce formatı koruyoruz
    const history = messages.slice(0, -1);

    // 3. Tüm işi Orkestratör'e devret (Retrieval -> Search -> Synthesis)
    const result = await aiOrchestrator.generateResponse(query, history);

    // 4. Cevabı Stream (Akış) olarak kullanıcıya dön
    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}