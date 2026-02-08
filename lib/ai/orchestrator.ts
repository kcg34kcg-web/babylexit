// Dosya: lib/ai/orchestrator.ts
import { SYSTEM_PROMPT, TIMEOUTS, AIResponse } from "./config";
import { GeminiProvider } from "./providers/gemini";
import { LlamaProvider } from "./providers/llama";
import { DeepSeekProvider } from "./providers/deepseek";
import { GrokProvider } from "./providers/grok";
import { GPT4Provider } from "./providers/gpt4";

class AIOrchestrator {
  private providers: any[] = [];

  constructor() {
    // MODELLERİ GÜVENLİ BİR ŞEKİLDE YÜKLÜYORUZ
    // Eğer birinin API Key'i yoksa hata verip uygulamayı çökertmek yerine
    // o modeli listeye eklemeyi atlıyoruz.

    this.tryAddProvider(() => new GeminiProvider(TIMEOUTS.GEMINI));
    this.tryAddProvider(() => new LlamaProvider(TIMEOUTS.GROQ));
    this.tryAddProvider(() => new DeepSeekProvider(TIMEOUTS.DEEPSEEK));
    this.tryAddProvider(() => new GrokProvider(TIMEOUTS.GROK));
    this.tryAddProvider(() => new GPT4Provider(TIMEOUTS.GPT4));

    if (this.providers.length === 0) {
      console.error("⚠️ HİÇBİR AI MODELİ YÜKLENEMEDİ! Lütfen .env dosyasını kontrol edin.");
    }
  }

  private tryAddProvider(providerFactory: () => any) {
    try {
      const provider = providerFactory();
      this.providers.push(provider);
    } catch (error: any) {
      // API Key eksikse buraya düşer, ama uygulama çökmez.
      // Sadece konsola sessizce not düşeriz.
      // console.log(`ℹ️ Model atlandı: ${error.message}`);
    }
  }

  /**
   * Soruya cevap bulana kadar aktif modelleri dener.
   */
  async getAnswer(userQuestion: string, context: string = ""): Promise<AIResponse> {
    if (this.providers.length === 0) {
      return {
        provider: "System",
        content: "Sistem yapılandırma hatası: Aktif yapay zeka sağlayıcısı bulunamadı. (API Keys eksik)",
        isFallback: true
      };
    }

    const fullSystemPrompt = context 
      ? `${SYSTEM_PROMPT}\n\nİLGİLİ BAĞLAM:\n${context}`
      : SYSTEM_PROMPT;

    console.log(`[AI Orchestrator] Analiz başlıyor... (${this.providers.length} aktif model)`);

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      
      try {
        console.log(`👉 Deneniyor: ${provider.name}`);
        
        // İsteği gönder (Timeout korumalı)
        const content = await provider.execute(userQuestion, fullSystemPrompt);

        // KONTROLLER
        if (!content || content.length < 20) {
            throw new Error("Cevap çok kısa veya boş.");
        }
        
        const lower = content.toLowerCase();
        if (content.length < 100 && (lower.includes("cannot fulfill") || lower.includes("yapay zeka modeli"))) {
             throw new Error("Model politik nedenlerle reddetti.");
        }

        console.log(`✅ BAŞARILI: ${provider.name} yanıt verdi.`);
        
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

    // HİÇBİRİ CEVAP VEREMEZSE
    return {
      provider: "System",
      content: "Şu an tüm yapay zeka sistemlerimiz aşırı yoğunluk nedeniyle yanıt veremiyor.",
      isFallback: true
    };
  }
}

// Singleton olarak dışa aktar
export const aiOrchestrator = new AIOrchestrator();