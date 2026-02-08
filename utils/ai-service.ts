import { aiOrchestrator } from "@/lib/ai/orchestrator";

// NOT: Artık burada GoogleGenerativeAI SDK'sını doğrudan çağırmıyoruz.
// Tüm  merkezi "Orchestrator" yönetiyor.

/**
 * Sorular için profesyonel hukuki analiz (Community Note) oluşturur.
 */
export async function generateAILegalNote(questionTitle: string, questionContent: string) {
  const prompt = `
    Sen "Babylexit" platformunda görev yapan kıdemli bir Türk Avukatı ve Hukuk Profesörüsün.
    Aşağıdaki hukuki soruyu analiz et ve halkı bilgilendirici, tarafsız ve profesyonel bir "Hukuki Bilgi Notu" hazırla.

    SORU BAŞLIĞI: "${questionTitle}"
    SORU İÇERİĞİ: "${questionContent}"

    TALİMATLAR:
    - Resmi, objektif ve akademik bir dil kullan.
    - Varsa ilgili kanun maddelerine (TMK, TBK, TCK vb.) atıfta bulun.
    - Yanıtın sonunda "Bu bir yasal tavsiye değildir" uyarısını mutlaka ekle.
    - Yanıtın toplamda 2-3 paragrafı geçmesin.
  `;

  try {
    // ESKİSİ: const result = await model.generateContent(prompt);
    // YENİSİ: Orchestrator kullanıyoruz (Hata verirse diğer modellere geçer)
    const result = await aiOrchestrator.getAnswer(prompt);
    return result.content;
  } catch (error) {
    console.error("Legal Note Hatası:", error);
    return "Hukuki analiz şu an oluşturulamıyor.";
  }
}

/**
 * Kullanıcı cevabını puanlar ve geri bildirim verir.
 */
export async function rateUserAnswer(questionContent: string, userAnswer: string) {
  const prompt = `
    Sen uzman bir Türk Avukatısın. Bir kullanıcının aşağıdaki soruya verdiği cevabı değerlendir.
    
    SORU: "${questionContent}"
    KULLANICI CEVABI: "${userAnswer}"

    GÖREVİN:
    1. Cevabı hukuki doğruluk açısından 0 ile 100 arasında puanla.
    2. Cevapla ilgili tek bir cümlelik, profesyonel bir Türkçe geri bildirim yaz.
    
    ÇIKTI FORMATI: Sadece aşağıdaki JSON formatında yanıt ver, başka açıklama ekleme:
    {
      "score": number,
      "feedback": "string"
    }
  `;

  try {
    // YENİSİ: Orchestrator ile cevap alıyoruz
    const result = await aiOrchestrator.getAnswer(prompt);
    
    // Gelen cevabı temizleyip JSON'a çeviriyoruz
    const responseText = result.content;
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Rating Hatası:", error);
    return { score: 0, feedback: "Değerlendirme şu an yapılamıyor." };
  }
}