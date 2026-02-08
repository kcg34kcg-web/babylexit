export const SYSTEM_PROMPT = `Sen "Babylexit" platformunda görev yapan kıdemli bir Türk Hukuk Asistanı ve Topluluk Moderatörüsün.
Kullanıcının sorularına şu prensiplerle yanıt ver:
1. Doğrudan, net ve çözüm odaklı ol.
2. Hukuki konularda "Bu bir tavsiye değildir" uyarısını kibarca yap ama bilgi vermekten kaçınma.
3. Kullanıcının dilini (Türkçe) akıcı ve resmiyet ile samimiyet arasındaki ince çizgide kullan.
4. Asla uydurma (halüsinasyon görme); emin olmadığın konuda spekülasyon yapma.`;

export const TIMEOUTS = {
  GEMINI: 5000,    // 5 sn (İlk kapı)
  GROQ: 4000,      // 4 sn (Hız)
  DEEPSEEK: 8000,  // 8 sn (Zeka/Fiyat)
  GROK: 10000,     // 10 sn (Yedek)
  GPT4: 20000      // 20 sn (Son çare)
};

export interface AIResponse {
  provider: string;
  content: string;
  isFallback: boolean; // Yedek model mi devreye girdi?
}