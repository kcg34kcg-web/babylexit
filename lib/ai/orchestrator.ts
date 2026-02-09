import { searchKnowledgeBase } from '@/app/actions/retrieve'; // Katman 2
import { googleSearch } from '@/lib/search-service';          // Katman 3
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai'; // generateText eklendi

const aiModel = createOpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});

const MODEL_NAME = process.env.GROQ_API_KEY ? 'llama3-70b-8192' : 'gpt-4o-mini';

export const aiOrchestrator = {
  /**
   * Canlı Sohbet İçin (Streaming)
   */
  async generateResponse(query: string, chatHistory: any[] = []) {
    // ... (Mevcut generateResponse kodların burada aynen kalsın) ...
    // Eğer sildiysen önceki cevabımdaki kodları buraya koyabilirsin.
    // Özetle: Yerel Ara -> Web Ara -> streamText ile dön.
    
    // Kod tekrarı olmaması için aşağıda sadece mantığı hatırlatıyorum,
    // sen mevcut kodunu koruyabilirsin.
    
    // 1. Retrieval
    const localDocs = await searchKnowledgeBase(query);
    let context = "";
    if (localDocs?.length) {
        context += "--- YEREL BİLGİ ---\n" + localDocs.map((d:any) => d.content).join('\n');
    } else {
        const web = await googleSearch(query);
        if(web?.length) context += "--- WEB ---\n" + web.map((w:any) => w.snippet).join('\n');
    }

    const systemPrompt = "Sen Babylexit asistanısın. Bağlamı kullanarak cevapla.";

    return streamText({
      model: aiModel(MODEL_NAME),
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: `BAĞLAM:\n${context}\n\nSORU: ${query}` }
      ],
    });
  },

  /**
   * 🆕 VERİTABANI KAYDI İÇİN (Statik Cevap)
   * Bu fonksiyon stream yapmaz, cevabın tamamını bekleyip metin olarak döner.
   */
  async generateStaticResponse(query: string) {
    console.log(`🧠 [Orchestrator-Static] Analiz Başlıyor: "${query}"`);

    // 1. Yerel Hafızayı Tara (Python API)
    const localDocs = await searchKnowledgeBase(query);
    let context = "";
    
    if (localDocs && localDocs.length > 0) {
      context += "--- KURUMSAL HAFIZA (ÖNCELİKLİ) ---\n";
      localDocs.slice(0, 4).forEach((doc: any) => {
        context += `- ${doc.content.slice(0, 600)}...\n`;
      });
    } 
    
    // 2. Web Araması (Yerel yetersizse veya her durumda)
    // Maliyet/Hız dengesi için: Yerel sonuç çok güçlüyse web'i atlayabiliriz.
    // Şimdilik her durumda arıyoruz:
    if (!localDocs || localDocs.length < 3) {
        try {
            const webResults = await googleSearch(query);
            if(webResults && webResults.length > 0) {
                context += "\n--- GÜNCEL WEB BİLGİLERİ ---\n";
                webResults.slice(0, 4).forEach((w: any) => {
                    context += `- ${w.title}: ${w.snippet}\n`;
                });
            }
        } catch (e) {
            console.error("Web arama hatası:", e);
        }
    }

    const systemPrompt = `
      Sen Babylexit hukuk ve mevzuat asistanısın. 
      Kullanıcının sorusuna, aşağıdaki BAĞLAM bilgilerini kullanarak detaylı, profesyonel ve yapılandırılmış (Markdown) bir cevap ver.
      
      Kurallar:
      1. Cevabın giriş, gelişme ve sonuç bölümleri olsun.
      2. Varsa kanun maddelerine veya belgelere atıf yap.
      3. Bağlamda bilgi yoksa "Mevcut kaynaklarımda bu bilgiye ulaşamadım" de, uydurma.
    `;

    // generateText: Cevabı tek seferde üretir ve metni döner
    const { text } = await generateText({
      model: aiModel(MODEL_NAME),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `BAĞLAM:\n${context}\n\nSORU: ${query}` }
      ],
    });

    return text;
  }
};