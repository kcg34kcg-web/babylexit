'use server';

import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from "@google/genai"; 
import { revalidatePath } from 'next/cache';
// YENİ: Merkezi güvenlik motorunu çağırıyoruz
import { checkContentSafety } from "./ai-engine"; 

const API_KEY = process.env.GEMINI_API_KEY; 

// Google GenAI istemcisi
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- YARDIMCI: Soru Metnini Vektöre Çevirme ---
async function generateEmbedding(text: string) {
  try {
    // text-embedding-004 modeli
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: [
        {
          parts: [
            { text: text }
          ]
        }
      ]
    });
    
    return response.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error("Embedding Hatası:", error);
    return null; // Hata olursa null dönsün, kayıt durmasın
  }
}

// --- YARDIMCI: Genel Amaçlı Akıllı Cevap Üretme ---
async function generateSmartAnswer(questionTitle: string, questionContent: string) {

  // PROMPT AYNI KALIYOR (Mevcut mantık korundu)
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

**ROLE:** You are a **Senior Legal Assistant** with academic rigor. Your tone is didactic, objective, terminologically precise (Turkish Legal Terminology), and direct. NO small talk ("Merhaba", "Yardımcı olayım" are FORBIDDEN).

**DECISION TREE (Follow Strictly):**

**1. MODE DETECTION:**
   * **MODE A: POSITIVE LAW (Current TR Law):**
     * *Triggers:* "Şu an", "Yürürlükte", "Madde kaç?", "Cezası nedir?", "TCK/TBK".
     * *Scope:* ONLY laws currently in force in Turkey. Repealed laws are void.
     * *Action:* Apply current statutes/Yargıtay rulings.
   * **MODE B: THEORETICAL / HISTORY:**
     * *Triggers:* "Roma Hukuku", "Mecelle", "Tarihçesi", "Felsefesi", "Mukayeseli".
     * *Action:* Use historical/philosophical sources.
   * *Conflict Rule:* If mixed, default to MODE B (Academic) but mention current status.

**2. CONTENT DEPTH:**
   * **CASE 1: POINT BLANK (Simple Facts):** Direct answer only. NO examples.
   * **CASE 2: REASONING (Complex Scenarios):** Explain theory, then add a SHORT "Örnek Olay:" scenario.

**3. MODULE A REQUIREMENTS:**
   * **Citations:** MANDATORY. (e.g., "TBK m. 112").
   * **Disclaimer:** Append: "⚖️ *Yasal Uyarı: Bu bilgi hukuki mütalaa değildir.*"

---

### 🔵 MODULE B: ALL OTHER DOMAINS (ADAPTIVE EXPERT) ###
*Triggered when context is: Engineering, Health, General Culture, Science, etc.*

**1. DYNAMIC PERSONA:**
   * **Engineering/Coding:** Act as a **Senior Principal Engineer**. Provide secure, production-ready code/logic.
   * **Health/Medicine:** Act as a **Medical Research Analyst**. Provide informational accuracy based on guidelines.
   * **General:** Act as an **Objective Expert**.

**2. MODULE B SAFETY GUARDRAILS:**
   * **Health Disclaimer:** If Health-related, MUST end with: "⚠️ *Uyarı: Doktor değilim. Tıbbi tavsiye değildir.*"
   * **Dangerous Content:** REFUSE to answer queries about weapons, illegal acts, or self-harm.

**3. MODULE B REQUIREMENTS:**
   * **Format:** Use Markdown (Bold key terms).
   * **Tone:** Professional, Helpful, Instructional.

---

### EXECUTION INSTRUCTION ###
Apply the Supreme Rules (Max 2 Paragraphs). Detect domain. Generate response.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
      contents: [
        { 
          role: 'user', 
          parts: [{ text: systemPrompt }] 
        }
      ]
    });

    const textAnswer = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textAnswer) {
      throw new Error("Yapay zeka boş cevap döndürdü.");
    }

    return textAnswer; 

  } catch (error: any) {
    console.error("AI Model Hatası:", error);
    return `Yapay zeka servisine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin veya topluluk cevaplarını bekleyin. (Hata: ${error.message})`;
  }
}

// --- ANA FONKSİYON: Soru Gönderme ---
export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const target = formData.get('target') as string; // 'ai' veya 'community'

  if (!title || !content) {
    return { error: 'Başlık ve içerik zorunludur.' };
  }

  // --- 1. KULLANICI KONTROLÜ ---
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Kullanıcı girişi yapılmamış.' };
  }

  // --- 2. GÜVENLİK VE MODERASYON KONTROLÜ (YENİ) ---
  // Kredi düşmeden önce içeriği denetliyoruz.
  const safetyCheck = await checkContentSafety(`${title}\n${content}`);
  
  if (!safetyCheck.isSafe) {
    // Eğer içerik zararlıysa, işlemi burada durduruyoruz.
    return { error: safetyCheck.reason || "Sorunuz topluluk kurallarına aykırı bulunduğu için oluşturulamadı." };
  }

  // --- 3. KREDİ AYARLARI ---
  const AI_UCRETI = 3;
  const COMMUNITY_UCRETI = 1;
  const SORU_UCRETI = target === 'ai' ? AI_UCRETI : COMMUNITY_UCRETI;

  // --- 4. KREDİ KONTROLÜ ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Profil bilgisi bulunamadı.' };
  }

  if (profile.credits < SORU_UCRETI) {
    return { error: `Yetersiz kredi. Bu işlem için ${SORU_UCRETI} kredi gereklidir.` };
  }

  // --- 5. KREDİ DÜŞME ---
  const newBalance = profile.credits - SORU_UCRETI;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', user.id);

  if (updateError) {
    return { error: 'Kredi işlemi başarısız oldu.' };
  }

  // --- 6. EMBEDDING (VEKTÖR) OLUŞTURMA ---
  const textForEmbedding = `${title} ${content.substring(0, 200)}`.replace(/\n/g, " ");
  const embedding = await generateEmbedding(textForEmbedding);

  // --- 7. SORUYU KAYDETME ---
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      user_id: user.id,
      asked_to_ai: target === 'ai',
      embedding: embedding // Vektör kaydı
    })
    .select()
    .single();

  if (questionError) {
    console.error("Soru kayıt hatası:", questionError);
    return { error: "Soru kaydedilirken bir veritabanı hatası oluştu." };
  }

  // --- 8. AI CEVABI (EĞER İSTENMİŞSE) ---
  if (target === 'ai') {
    const aiResponseContent = await generateSmartAnswer(title, content);
    
    await supabase
      .from('answers')
      .insert({
        question_id: questionData.id,
        user_id: user.id, 
        content: aiResponseContent,
        is_ai_generated: true,
        is_verified: false 
      });
  }

  revalidatePath('/questions');
  revalidatePath('/dashboard');
  
  return { 
    success: true, 
    questionId: questionData.id, 
    newCredits: newBalance,
    targetUsed: target 
  };
}