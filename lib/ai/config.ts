// Dosya: lib/ai/config.ts

export const SYSTEM_PROMPT = `Sen yardımsever, doğrudan ve zeki bir asistansın. 
Kullanıcının dilinde yanıt ver. 
Cevapların net ve çözüm odaklı olsun. 
Bir yapay zeka olduğunu gereksiz yere belirtme.`;

// Milisaniye cinsinden zaman aşımı süreleri
export const TIMEOUTS = {
  GEMINI: 5000,    // 5 sn (İlk kapı)
  GROQ: 4000,      // 4 sn (Hız canavarı)
  DEEPSEEK: 8000,  // 8 sn (Fiyat/Performans)
  GROK: 10000,     // 10 sn (Joker)
  GPT4: 20000      // 20 sn (Son çare)
};

export interface AIResponse {
  provider: string;
  content: string;
  isFallback: boolean;
}