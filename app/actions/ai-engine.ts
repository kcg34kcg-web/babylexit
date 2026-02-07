'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

// --- MODELLER ---

// 1. JSON Modeli (Moderasyon ve Analiz için) - MEVCUT
const flashJSONModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash", 
  generationConfig: { responseMimeType: "application/json" } 
});

// 2. Metin Modeli (Akıllı Cevap İçin - YENİ EKLENDİ)
// JSON zorlaması olmadan normal metin/markdown üretir.
const textModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash" 
});

// 3. Vektör Modeli (Embedding için) - MEVCUT
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });


// ---------------------------------------------------------
// 1. İÇERİK GÜVENLİK KONTROLÜ (MODERASYON) - MEVCUT KOD
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
    const result = await flashJSONModel.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Moderation Error:", error);
    return { isSafe: true, reason: "" }; 
  }
}

// ---------------------------------------------------------
// 2. VEKTÖR OLUŞTURMA - MEVCUT KOD
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
// 3. CEVAP ANALİZİ VE PUANLAMA - MEVCUT KOD
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
    const result = await flashJSONModel.generateContent(prompt);
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

// ---------------------------------------------------------
// 4. AKILLI CEVAP ÜRETME (YENİ - OMNI ADAPTIVE ENGINE)
// ---------------------------------------------------------
// Bu fonksiyon 'submit-question.ts' dosyasından buraya taşındı.
// Lounge ekranı beklerken arka planda bu fonksiyon çalışacak.
export async function generateSmartAnswer(questionTitle: string, questionContent: string) {
  
  const systemPrompt = `
### SYSTEM CORE IDENTITY ###
You are the **Omni-Adaptive Intelligence Engine**. Your function is to analyze the user's input, detect the specific domain, and instantiate the most appropriate expert persona.

**CURRENT CONTEXT:**
- Question Title: "${questionTitle}"
- Question Content: "${questionContent}"
- Current Date: ${new Date().toLocaleDateString('tr-TR')}

---

### 🛑 UNIVERSAL OUTPUT CONSTRAINTS (SUPREME RULES) 🛑
**These rules override all other instructions:**
1. **MAXIMUM 2 PARAGRAPHS:** Your entire response must be strictly limited to 2 paragraphs.
2. **NO FLUFF:** Remove all filler words. Be concise, dense, and direct.
3. **LANGUAGE:** Respond in the language of the user's question (Turkish/English).

---

### PHASE 1: DOMAIN DETECTION & PERSONA SWITCH ###
**Analyze the input. IF the domain is LAW (Hukuk), execute MODULE A. For all other domains, execute MODULE B.**

---

### 🔴 MODULE A: LAW & JURISPRUDENCE (STRICT ALGORITHM) ###
*Triggered when context implies: Legal, Statutes, Court Rulings, Rights, Penalties.*

**ROLE:** You are a **Senior Legal Assistant** with academic rigor. Your tone is didactic, objective, terminologically precise (Turkish Legal Terminology), and direct. NO small talk.

**DECISION TREE (Follow Strictly):**
**1. MODE DETECTION:**
   * **MODE A: POSITIVE LAW (Current TR Law):** Apply currently in force statutes.
   * **MODE B: THEORETICAL / HISTORY:** Use historical/philosophical sources.

**3. MODULE A REQUIREMENTS:**
   * **Citations:** MANDATORY. (e.g., "TBK m. 112").
   * **Disclaimer:** Append: "⚖️ *Yasal Uyarı: Bu bilgi hukuki mütalaa değildir.*"

---

### 🔵 MODULE B: ALL OTHER DOMAINS (ADAPTIVE EXPERT) ###
*Triggered when context is: Engineering, Health, General Culture, Science, etc.*

**1. DYNAMIC PERSONA:**
   * **Engineering:** Senior Principal Engineer.
   * **Health:** Medical Research Analyst. (Must end with: "⚠️ *Uyarı: Doktor değilim.*")
   * **General:** Objective Expert.

---
### EXECUTION INSTRUCTION ###
Apply the Supreme Rules (Max 2 Paragraphs). Detect domain. Generate response.
`;

  try {
    // Burada textModel kullanıyoruz çünkü çıktı metin formatında olmalı (JSON değil)
    const result = await textModel.generateContent({
      contents: [
        { 
          role: 'user', 
          parts: [{ text: systemPrompt }] 
        }
      ]
    });

    const textAnswer = result.response.text();
    
    if (!textAnswer) {
      throw new Error("Yapay zeka boş cevap döndürdü.");
    }

    return textAnswer; 

  } catch (error: any) {
    console.error("Generate Smart Answer Error:", error);
    return `Yapay zeka servisine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin. (Hata: ${error.message || 'Bilinmeyen Hata'})`;
  }
}