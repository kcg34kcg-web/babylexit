import { GoogleGenerativeAI } from "@google/generative-ai";

// API Anahtarını .env.local dosyasından alıyoruz
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// En hızlı ve verimli model olan Gemini 1.5 Flash'ı kullanıyoruz
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Soru için profesyonel bir hukuki analiz (Community Note) oluşturur.
 */
export async function generateAILegalNote(questionTitle: string, questionContent: string) {
  const prompt = `
    Sen uzman bir Türk Avukatısın. Aşağıdaki hukuki soruya profesyonel, objektif ve güvenilir bir analiz hazırla.
    Analizin, X (Twitter) Topluluk Notları gibi kısa, öz ve bilgilendirici olmalı.
    
    Kurallar:
    - İlgili Türk kanun maddelerine (TBK, TMK, TCK vb.) atıfta bulunmaya çalış.
    - Dil resmi ve ciddi olmalı.
    - Yanıtın en fazla 3-4 paragraf olsun.
    
    Soru Başlığı: ${questionTitle}
    Soru İçeriği: ${questionContent}
    
    Analiz:
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Soru Analiz Hatası:", error);
    return "Yapay zeka analizi şu an oluşturulamıyor.";
  }
}

/**
 * Kullanıcının verdiği cevabı puanlar ve kısa geri bildirim verir.
 */
export async function rateUserAnswer(questionContent: string, userAnswer: string) {
  const prompt = `
    Sen bir hukuk eğitmenisin. Bir öğrencinin aşağıdaki hukuki soruya verdiği cevabı değerlendir.
    
    Soru: ${questionContent}
    Öğrenci Cevabı: ${userAnswer}
    
    Lütfen yanıtını SADECE aşağıdaki formatta bir JSON olarak ver:
    {
      "score": (0-100 arası bir sayı),
      "feedback": (Cevabın doğruluğu hakkında Türkçe tek bir kısa cümle)
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON içeriğini metnin içinden temizleyip alalım (bazen markdown ```json ekleyebiliyor)
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1) {
      return JSON.parse(text.substring(startIdx, endIdx + 1));
    }
    return { score: 50, feedback: "Değerlendirme yapılamadı." };
  } catch (error) {
    console.error("Gemini Puanlama Hatası:", error);
    return { score: 0, feedback: "Hata oluştu." };
  }
}