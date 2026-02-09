// Dosya: lib/ai/orchestrator.ts

// 1. Gerekli Araçları İçe Aktar
import { searchKnowledgeBase } from '@/app/actions/retrieve'; // Katman 2: Yerel Hafıza (Python API)
import { googleSearch } from '@/lib/search-service';          // Katman 3: Google Arama
import { createOpenAI } from '@ai-sdk/openai';                // Vercel AI SDK (Standart Arabirim)
import { streamText, generateText } from 'ai';

// 2. Model Yapılandırması (Groq veya OpenAI)
// Bu yapı, senin eski Provider class'larının yaptığı işi daha modern ve standart bir yolla yapar.
const aiModel = createOpenAI({
  // Eğer .env dosyasında GROQ_API_KEY varsa onu kullan, yoksa OpenAI'ye düş
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});

// Model Seçimi: Groq varsa Llama 3 (Hızlı), yoksa GPT-4o-mini (Akıllı)
const MODEL_NAME = process.env.GROQ_API_KEY ? 'llama3-70b-8192' : 'gpt-4o-mini';

export const aiOrchestrator = {
  
  /**
   * 🧠 ANA BEYİN FONKSİYONU
   * Kullanıcı sorusunu alır -> Yerel Hafızayı Tarar -> Gerekirse Google'a Bakar -> Cevabı Sentezler.
   */
  async generateResponse(query: string, chatHistory: any[] = []) {
    console.log(`🧠 [Orchestrator] Düşünüyor: "${query}"`);

    // --- AŞAMA 1 & 2: YEREL BİLGİ BANKASI (Hafıza) ---
    // Python API'sine sor: "Buna benzer doküman var mı?"
    const localDocs = await searchKnowledgeBase(query);
    
    let context = "";
    let sources: { title: string; type: 'local' | 'web'; url?: string }[] = [];

    // Eğer yerel doküman bulursak, bağlama ekle
    if (localDocs && localDocs.length > 0) {
      console.log(`✅ Yerel Hafızada Bulundu: ${localDocs.length} parça.`);
      
      context += "--- KURUMSAL / YEREL BİLGİ BANKASI (ÖNCELİKLİ) ---\n";
      localDocs.forEach((doc: any, i: number) => {
        // Çok fazla token harcamamak için her parçanın ilk 500 karakterini alalım
        context += `[Yerel Kaynak ${i + 1}]: ${doc.content.slice(0, 800)}...\n`;
        // Kaynakça için listeye ekle
        sources.push({ 
            title: doc.metadata?.source?.split('/').pop() || 'Bilinmeyen Belge', 
            type: 'local' 
        });
      });
    } 
    
    // --- AŞAMA 3: DIŞ DÜNYA (Google Arama) ---
    // Eğer yerel bilgi azsa veya hiç yoksa Google'a çık
    // (Maliyet optimizasyonu için: Yerel bilgi çok güçlüyse burayı atlayabiliriz)
    if (!localDocs || localDocs.length < 2) {
      console.log("🌐 Yerel bilgi yetersiz, Google araması yapılıyor...");
      try {
        const webLinks = await googleSearch(query);
        if (webLinks && webLinks.length > 0) {
          context += "\n--- İNTERNET ARAMA SONUÇLARI ---\n";
          webLinks.slice(0, 3).forEach((link, i) => {
             context += `[Web Kaynak ${i + 1}]: ${link}\n`;
             sources.push({ title: link, type: 'web', url: link });
          });
          // Not: İleride buraya 'scraper' ekleyip linkin içeriğini de okuyabiliriz.
        }
      } catch (err) {
        console.error("Google Arama Hatası:", err);
      }
    }

    // --- AŞAMA 4: SENTEZ (LLM) ---
    const systemPrompt = `
      Sen uzman, yardımsever ve Türkçe konuşan bir yapay zeka asistanısın.
      Görevin: Kullanıcının sorusunu, sana sağlanan "BAĞLAM" (Context) bilgisini kullanarak cevaplamaktır.
      
      KURALLAR:
      1. Sadece verilen bağlamdaki bilgileri kullan. Bağlamda cevap yoksa "Elimdeki dokümanlarda bu bilgiye ulaşamadım" de.
      2. Asla uydurma (Halüsinasyon görme).
      3. Öncelikle "YEREL BİLGİ BANKASI"ndaki bilgilere güven.
      4. Cevabın akıcı, profesyonel ve Türkçe olsun.
      5. Cevabını Markdown formatında ver.
    `;

    // Streaming Cevap Başlat
    // Bu, cevabın kelime kelime ön yüze akmasını sağlar.
    const result = await streamText({
      model: aiModel(MODEL_NAME),
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory, // Önceki konuşmaları hatırla
        { role: 'user', content: `BAĞLAM:\n${context}\n\nSORU: ${query}` }
      ],
    });

    return result;
  },

  /**
   * (Opsiyonel) Araştırma İşlerini (Background Jobs) işleyen fonksiyon
   * Eski processResearchJob mantığını buraya taşıyabiliriz.
   */
  async processBackgroundJob(jobId: string, query: string) {
     // Burası deep-research.ts için ayrıldı.
     // Şimdilik Chat odaklı gidiyoruz.
  }
};