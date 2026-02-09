// Dosya: lib/ai/orchestrator.ts
import { createClient } from "@/utils/supabase/server";
import { SYSTEM_PROMPT, TIMEOUTS, AIResponse } from "./config";
import { GeminiProvider } from "./providers/gemini";
import { LlamaProvider } from "./providers/llama";
import { DeepSeekProvider } from "./providers/deepseek";
import { GrokProvider } from "./providers/grok";
import { GPT4Provider } from "./providers/gpt4";
// Stage 1 ve 2 için gerekli yardımcılar (Mevcut yapına uygun importlar)
// Not: Bu fonksiyonları henüz yazmadıysak bile yapıyı kuruyoruz.
import { findSimilarQuestion } from "./embedding"; // Stage 1
import { retrieveContext } from "./rag-engine";    // Stage 2 (Gelecek dosya)

class AIOrchestrator {
  private providers: any[] = [];

  constructor() {
    // MODELLERİ GÜVENLİ BİR ŞEKİLDE YÜKLÜYORUZ
    this.tryAddProvider(() => new GeminiProvider(TIMEOUTS.GEMINI));
    this.tryAddProvider(() => new LlamaProvider(TIMEOUTS.GROQ));
    this.tryAddProvider(() => new DeepSeekProvider(TIMEOUTS.DEEPSEEK));
    this.tryAddProvider(() => new GrokProvider(TIMEOUTS.GROK));
    this.tryAddProvider(() => new GPT4Provider(TIMEOUTS.GPT4));

    if (this.providers.length === 0) {
      console.error("⚠️ HİÇBİR AI MODELİ YÜKLENEMEDİ! .env dosyasını kontrol edin.");
    }
  }

  private tryAddProvider(providerFactory: () => any) {
    try {
      const provider = providerFactory();
      this.providers.push(provider);
    } catch (error: any) {
      // console.log(`ℹ️ Model atlandı: ${error.message}`);
    }
  }

  /**
   * 🚀 LOUNGE MODU İÇİN ANA FONKSİYON
   * Bu fonksiyon, kullanıcı Lounge'da beklerken arka planda çalışır.
   * 4 Aşamalı Savunma Hattını uygular ve sonucu Veritabanına yazar.
   */
  async processResearchJob(jobId: string, query: string, userId: string) {
    console.log(`🤖 [Orchestrator] İşleme Başladı. JobID: ${jobId}`);
    const supabase = await createClient();

    try {
      // Durumu 'processing' yap
      await supabase.from('research_jobs').update({ status: 'processing' }).eq('id', jobId);

      // --- AŞAMA 1: HAFIZA KONTROLÜ (Cache) ---
      // Daha önce sorulmuş benzer soru var mı?
      // const cachedAnswer = await findSimilarQuestion(query);
      // if (cachedAnswer) {
      //   await this.completeJob(jobId, cachedAnswer, [{ title: "Benzer Soru", url: "internal-cache" }]);
      //   return;
      // }

      // --- AŞAMA 2: İÇERİK KONTROLÜ (RAG) ---
      // Bizim makalelerde, kanunlarda cevap var mı?
      // const internalContext = await retrieveContext(query);
      // if (internalContext.confidence > 0.85) { ... }
      
      // --- AŞAMA 3: DERİN ARAŞTIRMA (MELEZ YAPI - PYTHON) ---
      // *Şu an Python servisini bekliyoruz.*
      // Eğer Python servisi aktifse, işi burada bırakıp Python'un devralmasını bekleyebiliriz
      // veya Python API'sini buradan tetikleyebiliriz.
      // Şimdilik Stage 4'e düşüyoruz (Fallback).

      // --- AŞAMA 4: STANDART AI (FALLBACK) ---
      console.log(`⚠️ [Orchestrator] Derin araştırma yapılamadı, yedek modellere geçiliyor...`);
      const aiResponse = await this.getAnswer(query, "Kullanıcı derin hukuki analiz bekliyor.");
      
      // Sonucu veritabanına yaz (Lounge bunu görecek)
      await this.completeJob(jobId, aiResponse.content, [{ title: aiResponse.provider, url: "#" }]);

    } catch (error) {
      console.error(`❌ [Orchestrator] Kritik Hata:`, error);
      await supabase.from('research_jobs').update({ status: 'failed', result: 'Bir hata oluştu.' }).eq('id', jobId);
    }
  }

  // Yardımcı: İşi başarıyla tamamla ve kaydet
  private async completeJob(jobId: string, result: string, sources: any[]) {
    const supabase = await createClient();
    await supabase.from('research_jobs').update({
      status: 'completed',
      result: result,
      sources: sources,
      updated_at: new Date().toISOString()
    }).eq('id', jobId);
    console.log(`✅ [Orchestrator] İş Tamamlandı: ${jobId}`);
  }

  /**
   * Standart Soru-Cevap Döngüsü (Stage 4)
   */
  async getAnswer(userQuestion: string, context: string = ""): Promise<AIResponse> {
    if (this.providers.length === 0) {
      return {
        provider: "System",
        content: "Sistem yapılandırma hatası: Aktif yapay zeka sağlayıcısı bulunamadı.",
        isFallback: true
      };
    }

    const fullSystemPrompt = context 
      ? `${SYSTEM_PROMPT}\n\nİLGİLİ BAĞLAM:\n${context}`
      : SYSTEM_PROMPT;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      try {
        console.log(`👉 Deneniyor: ${provider.name}`);
        const content = await provider.execute(userQuestion, fullSystemPrompt);

        if (!content || content.length < 20) throw new Error("Cevap yetersiz.");
        
        return {
          provider: provider.name,
          content: content,
          isFallback: i > 0 
        };
      } catch (error: any) {
        console.warn(`❌ BAŞARISIZ (${provider.name}): ${error.message}`);
        continue;
      }
    }

    return {
      provider: "System",
      content: "Tüm sistemler meşgul, lütfen daha sonra tekrar deneyiniz.",
      isFallback: true
    };
  }
}

export const aiOrchestrator = new AIOrchestrator();