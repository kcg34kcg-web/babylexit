'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Modeller
// Moderasyon ve analiz için hızlı model (Flash)
const flashModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash", 
  generationConfig: { responseMimeType: "application/json" } 
});

// Vektör işlemleri için embedding modeli
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// ---------------------------------------------------------
// 1. İÇERİK GÜVENLİK KONTROLÜ (MODERASYON)
// ---------------------------------------------------------
export async function checkContentSafety(text: string) {
  const prompt = `
    Sen "Babylexit" hukuk ve topluluk platformunun içerik moderatörüsün.
    Aşağıdaki metni analiz et.

    METİN: "${text}"

    KRİTERLER:
    - Küfür, ağır hakaret, aşağılama var mı?
    - Açıkça şiddet tehdidi veya fiziksel zarar verme isteği var mı?
    - Yasadışı faaliyetlere (uyuşturucu, kaçakçılık vb.) teşvik var mı?
    - Hukuki tartışma adabına uymayan cinsel içerik var mı?

    NOT: "Öldürme suçu", "tecavüz davası" gibi hukuki terimlerin kullanılması YASAK DEĞİLDİR. Sadece şahsa saldırı ve toksik dil yasaktır.

    YANIT FORMATI (JSON):
    {
      "isSafe": boolean, 
      "reason": "string" (Eğer false ise, kullanıcıya gösterilecek nazik bir uyarı mesajı. Örn: "İçeriğiniz hakaret içerdiği için...")
    }
  `;

  try {
    const result = await flashModel.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Moderation Error:", error);
    // Hata durumunda kullanıcıyı engellememek için (fail-open) veya güvenli olsun diye engellemek (fail-closed) senin tercihin.
    // Şimdilik güvenli varsayıyoruz:
    return { isSafe: true, reason: "" }; 
  }
}

// ---------------------------------------------------------
// 2. VEKTÖR OLUŞTURMA
// ---------------------------------------------------------
export async function generateEmbedding(text: string) {
  try {
    const cleanText = text.replace(/\n/g, " ");
    const result = await embeddingModel.embedContent(cleanText);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding Error:", error);
    return null;
  }
}

// ---------------------------------------------------------
// 3. CEVAP ANALİZİ VE PUANLAMA
// ---------------------------------------------------------
export async function analyzeAnswer(answerId: string, content: string, questionTitle: string) {
  const supabase = await createClient();
  
  const prompt = `
    Sen "Babylexit" platformunda uzman bir asistan ve moderatörsün.
    SORU: "${questionTitle}"
    KULLANICI CEVABI: "${content}"
    
    GÖREVİN:
    1. Sorunun alanını tespit et (Hukuk, Genel, vb.).
    2. Cevabı doğruluk açısından 0-100 arası puanla.
    3. Eksik veya yanlış varsa düzelt.
    4. Yorumun MAKSİMUM 2 PARAGRAF olsun. Profesyonel ve yapıcı ol.
    
    YANIT FORMATI (JSON): 
    {"score": 85, "critique": "Alan: [Alan]. \n\n Yorum..."}
  `;

  try {
    const result = await flashModel.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    const data = JSON.parse(responseText);

    await supabase.from('answers').update({ 
      ai_score: data.score, 
      ai_feedback: data.critique 
    }).eq('id', answerId);

    return { success: true, data };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { success: false };
  }
}