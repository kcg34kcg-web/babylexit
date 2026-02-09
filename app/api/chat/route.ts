import { openai } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages, Message } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/lib/ai/embedding';

// Groq'u OpenAI SDK uyumluluğu ile tanımlıyoruz
const groqModel = openai('groq/qwen-2.5-32b', {
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1', // Groq'un OpenAI uyumlu endpoint'i
});

export const maxDuration = 30; // Vercel fonksiyon zaman aşımı (saniye)

export async function POST(req: Request) {
  try {
    // 1. Kullanıcı mesajlarını al
    const { messages } = await req.json();
    
    // Son mesaj kullanıcının yeni sorusudur
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // 2. Soruyu Vektöre Çevir (Embedding)
    const embedding = await generateEmbedding(userQuery);

    // 3. Supabase'den Alakalı Dokümanları Çek (Retrieval)
    const supabase = await createClient();
    
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      query_text: userQuery, // Full-text search için ham metin
      match_threshold: 0.5, // Benzerlik eşiği (0.5 ideal bir başlangıçtır)
      match_count: 5,       // En alakalı 5 parça
    });

    if (error) {
      console.error('Vector search error:', error);
      // Hata olsa bile chat devam etsin, sadece bağlam eksik olur.
    }

    // 4. Bağlam Metnini Oluştur
    // Bulunan dokümanları tek bir metin bloğu haline getiriyoruz.
    const contextText = documents?.map((doc: any) => 
      `---\n${doc.content}\n---`
    ).join('\n\n') || 'İlgili veri bulunamadı.';

    // 5. System Prompt'u Hazırla
    const systemPrompt = `
      Sen Babylexit projesinin gelişmiş AI asistanısın.
      Kullanıcıların hukuk, mevzuat veya proje ile ilgili sorularını yanıtlıyorsun.
      
      Aşağıdaki "BAĞLAM BİLGİSİ"ni kullanarak soruyu cevapla.
      Eğer cevap bağlam içinde yoksa, genel bilgini kullan ama bunu belirt.
      Asla uydurma bilgi verme. Cevapların net, profesyonel ve Türkçe olsun.
      
      BAĞLAM BİLGİSİ:
      ${contextText}
    `;

    // 6. Yapay Zekaya Gönder ve Cevabı Stream Et (Akıt)
    const result = await streamText({
      model: groqModel,
      messages: convertToCoreMessages(messages), // Önceki konuşma geçmişini koru
      system: systemPrompt,
    });

    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error('Chat Route Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}