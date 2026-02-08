import { SYSTEM_PROMPT, TIMEOUTS, AIResponse } from "./config";
import { GeminiProvider } from "./providers/gemini";
import { LlamaProvider } from "./providers/llama";
import { DeepSeekProvider } from "./providers/deepseek";
import { GrokProvider } from "./providers/grok";
import { GPT4Provider } from "./providers/gpt4";

class AIOrchestrator {
  private providers: any[];

  constructor() {
    // MODELLERİ BURAYA MALİYET/HIZ SIRASINA GÖRE DİZİYORUZ
    // 1. Gemini (En ucuz)
    // 2. Llama (En hızlı)
    // 3. DeepSeek (Fiyat/Performans kralı)
    // 4. Grok (Joker)
    // 5. GPT-4 (Son çare)
    
    this.providers = [
      new GeminiProvider(TIMEOUTS.GEMINI),
      new LlamaProvider(TIMEOUTS.GROQ),
      new DeepSeekProvider(TIMEOUTS.DEEPSEEK),
      new GrokProvider(TIMEOUTS.GROK),
      new GPT4Provider(TIMEOUTS.GPT4),
    ];
  }

  /**
   * Soruya cevap bulana kadar tüm modelleri sırayla dener.
   */
  async getAnswer(userQuestion: string, context: string = ""): Promise<AIResponse> {
    const fullSystemPrompt = context 
      ? `${SYSTEM_PROMPT}\n\nİLGİLİ HUKUKİ BAĞLAM:\n${context}`
      : SYSTEM_PROMPT;

    console.log(`[AI Orchestrator] Analiz başlıyor: "${userQuestion.substring(0, 30)}..."`);

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      
      try {
        console.log(`👉 Deneniyor: ${provider.name} (Adım ${i + 1}/${this.providers.length})`);
        
        // İsteği gönder
        const content = await provider.execute(userQuestion, fullSystemPrompt);

        // KONTROLLER (Refusal Check)
        if (!content || content.length < 20) {
            throw new Error("Cevap çok kısa veya boş.");
        }
        
        // Temel filtreleme (Basit kelime bazlı)
        const lower = content.toLowerCase();
        if (content.length < 100 && (lower.includes("cannot fulfill") || lower.includes("yapay zeka modeli"))) {
             throw new Error("Model politik nedenlerle reddetti.");
        }

        console.log(`✅ BAŞARILI: ${provider.name} yanıt verdi.`);
        
        return {
          provider: provider.name,
          content: content,
          isFallback: i > 0 // Eğer ilk model değilse true döner
        };

      } catch (error: any) {
        console.warn(`❌ BAŞARISIZ (${provider.name}): ${error.message}`);
        // Döngü devam eder, bir sonraki modele geçer...
        continue;
      }
    }

    // HİÇBİRİ CEVAP VEREMEZSE
    return {
      provider: "System",
      content: "Şu an tüm yapay zeka sistemlerimiz aşırı yoğunluk veya teknik bir sorun nedeniyle yanıt veremiyor. Lütfen sorunuzu basitleştirerek tekrar deneyin veya bir süre bekleyin.",
      isFallback: true
    };
  }
}

// Singleton olarak dışa aktar (Her seferinde yeni class oluşturmasın)
export const aiOrchestrator = new AIOrchestrator();