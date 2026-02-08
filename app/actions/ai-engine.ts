'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";
import { redis } from "@/lib/redis";
import { rewardUserForAIReference } from "./rewards"; 

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

// --- MODELLER ---

const flashJSONModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash", 
  generationConfig: { responseMimeType: "application/json" } 
});

const textModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash" 
});

const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });


// =========================================================
// YEREL KURALLAR (ROUTER)
// =========================================================
const STATIC_RULES = [
  {
    keywords: ["merhaba", "selam", "hi", "hey", "günaydın", "iyi akşamlar", "iyi geceler"],
    response: "Merhaba! Ben Babylexit Asistanı. Hukuki sorularınız veya toplulukla ilgili konularda size nasıl yardımcı olabilirim?"
  },
  {
    keywords: ["kimsin", "nesin", "adın ne", "sen kimsin"],
    response: "Ben Babylexit platformunun yapay zeka destekli hukuk ve topluluk asistanıyım. Size benzer davalar, kanun maddeleri ve topluluk tecrübeleri konusunda rehberlik etmek için buradayım."
  },
  {
    keywords: ["nasılsın", "ne haber"],
    response: "Ben bir yapay zeka olduğum için hislerim yok ama sistemlerim %100 çalışıyor! Size nasıl destek olabilirim?"
  },
  {
    keywords: ["test", "deneme", "123", "ses", "kontrol"],
    response: "Sistem aktif ve çalışıyor. Sorunuzu sorabilirsiniz."
  },
  {
    keywords: ["iletişim", "destek", "mail", "adres", "telefon"],
    response: "Bizimle iletişime geçmek için 'İletişim' sayfasını kullanabilir veya support@babylexit.com adresine mail atabilirsiniz."
  }
];

function checkLocalRules(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  if (lowerText.length < 3) return "Lütfen biraz daha detaylı bir soru sorabilir misiniz?";

  for (const rule of STATIC_RULES) {
    if (rule.keywords.some(k => lowerText === k || (lowerText.includes(k) && lowerText.length < 30))) {
      return rule.response;
    }
  }
  return null;
}

// =========================================================
// YARDIMCI: LOGLAMA SİSTEMİ (METRICS)
// =========================================================
async function logAIAction(source: string, costSaved: boolean, startTime: number) {
  // Bu fonksiyonu await etmeden çağıracağız (Fire-and-forget)
  (async () => {
    try {
      const duration = Date.now() - startTime;
      const supabase = await createClient();
      await supabase.from('ai_logs').insert({
        source: source,          // 'router', 'redis', 'community', 'vector', 'api'
        cost_saved: costSaved,   // true/false
        latency_ms: duration,    // İşlem süresi (ms)
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("AI Log Error:", error);
    }
  })();
}

// ---------------------------------------------------------
// 1. İÇERİK GÜVENLİK KONTROLÜ
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
    YANIT FORMATI (JSON):
    {
      "isSafe": boolean, 
      "reason": "string"
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
// 4. ARAMA FONKSİYONLARI (RAG & COMMUNITY)
// ---------------------------------------------------------

async function searchVectorDB(userQuestion: string) {
  const supabase = await createClient();
  const embedding = await generateEmbedding(userQuestion);
  if (!embedding) return null;

  const { data: similarQuestions, error } = await supabase.rpc('match_similar_questions', {
    query_embedding: embedding,
    match_threshold: 0.85, 
    match_count: 1
  });

  if (error) return null;

  if (similarQuestions && similarQuestions.length > 0) {
    console.log(`🧠 AI MEMORY HIT: Benzer AI cevabı bulundu!`);
    return similarQuestions[0].answer_text;
  }
  return null;
}

async function searchCommunityQuestions(userQuestion: string) {
  const supabase = await createClient();
  const embedding = await generateEmbedding(userQuestion);
  if (!embedding) return null;

  const { data: similarQuestions, error } = await supabase.rpc('match_community_questions', {
    query_embedding: embedding,
    match_threshold: 0.90, 
    match_count: 1
  });

  if (error) return null;

  if (similarQuestions && similarQuestions.length > 0) {
    const similarQ = similarQuestions[0];
    
    const { data: bestAnswer } = await supabase
      .from('answers')
      .select('content, author_id, question_id')
      .eq('question_id', similarQ.id)
      .order('vote_count', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bestAnswer) {
      console.log(`👥 COMMUNITY HIT: "${similarQ.title}" bulundu.`);

      // Ödül Sistemi (Background)
      if (bestAnswer.author_id) {
        rewardUserForAIReference(bestAnswer.author_id, bestAnswer.question_id)
          .catch(err => console.error("Ödül sistemi hatası:", err));
      }

      return `**(Topluluk Arşivinden)**\n\nBu soru daha önce topluluğumuzda sorulmuştu. İşte topluluktan en çok beğenilen cevap:\n\n---\n${bestAnswer.content}\n---`;
    }
  }
  return null;
}

// ---------------------------------------------------------
// 5. AKILLI CEVAP ÜRETME (LOGLAMA EKLENDİ)
// ---------------------------------------------------------
export async function generateSmartAnswer(questionTitle: string, questionContent: string) {
  const start = Date.now(); // ⏱️ SÜRE BAŞLADI
  const fullQuestion = `${questionTitle} ${questionContent}`;
  const cleanQuestion = fullQuestion.trim();
  const cacheKey = `smart_answer:${questionTitle.trim().toLowerCase().replace(/\s+/g, '_')}`;

  // --- AŞAMA 1: YEREL KURALLAR (ROUTER) ---
  const staticAnswer = checkLocalRules(cleanQuestion);
  if (staticAnswer) {
    console.log("🚦 ROUTER HIT: Statik kural devreye girdi.");
    logAIAction('router', true, start); // LOG: Cost Saved ✅
    return staticAnswer;
  }

  // --- AŞAMA 2: REDIS (ÖNBELLEK) ---
  try {
    const cachedAnswer = await redis.get(cacheKey);
    if (cachedAnswer) {
      console.log("⚡ REDIS HIT: Cevap önbellekten çekildi.");
      logAIAction('redis', true, start); // LOG: Cost Saved ✅
      return cachedAnswer;
    }
  } catch (e) {
    console.warn("Redis bağlantı hatası (Cache atlandı).");
  }

  // --- AŞAMA 3: GÜVENLİK KONTROLÜ ---
  const safetyCheck = await checkContentSafety(fullQuestion);
  if (!safetyCheck.isSafe) {
    return `⚠️ Üzgünüm, sorunuzu yanıtlayamıyorum. ${safetyCheck.reason}`;
  }

  // --- AŞAMA 4: TOPLULUK ARAMASI (ÖDÜL SİSTEMLİ) ---
  const communityAnswer = await searchCommunityQuestions(fullQuestion);
  if (communityAnswer) {
    await redis.set(cacheKey, communityAnswer, 'EX', 86400);
    logAIAction('community', true, start); // LOG: Cost Saved ✅
    return communityAnswer;
  }

  // --- AŞAMA 5: AI HAFIZASI (VECTOR DB) ---
  const vectorAnswer = await searchVectorDB(fullQuestion);
  if (vectorAnswer) {
    await redis.set(cacheKey, vectorAnswer, 'EX', 86400);
    logAIAction('vector', true, start); // LOG: Cost Saved ✅
    return vectorAnswer;
  }

  // --- AŞAMA 6: GEMINI API (SON ÇARE - MALİYETLİ) ---
  const systemPrompt = `
### SYSTEM CORE IDENTITY ###
You are the **Omni-Adaptive Intelligence Engine** for Babylexit. Your function is to analyze the user's input, detect the specific domain, and instantiate the most appropriate expert persona.
**CURRENT CONTEXT:**
- Question: "${fullQuestion}"
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
USER QUESTION: "${fullQuestion}"
`;

  try {
    const result = await textModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
    });

    let textAnswer = result.response.text();
    if (!textAnswer) throw new Error("Boş cevap");

    if (!textAnswer.includes("Yasal Uyarı")) {
        textAnswer += "\n\n> ⚖️ *Yasal Uyarı: Bu cevap yapay zeka tarafından oluşturulmuştur ve hukuki tavsiye niteliği taşımaz. Lütfen profesyonel bir avukata danışınız.*";
    }

    // --- KAYIT İŞLEMLERİ ---
    
    // a) Redis'e kaydet
    await redis.set(cacheKey, textAnswer, 'EX', 86400);

    // b) Vektör Veritabanına kaydet (Background)
    (async () => {
      try {
        const embedding = await generateEmbedding(fullQuestion);
        if (embedding) {
          const supabase = await createClient();
          await supabase.from('ai_knowledge_base').insert({
            question_text: fullQuestion,
            answer_text: textAnswer,
            embedding: embedding
          });
          console.log("💾 KNOWLEDGE SAVED: Yeni bilgi vektör veritabanına işlendi.");
        }
      } catch (dbError) {
        console.error("Vector DB save error (Background):", dbError);
      }
    })();

    // 🔴 LOG: Cost Saved = FALSE (Çünkü API kullandık)
    logAIAction('api', false, start); 

    return textAnswer; 

  } catch (error: any) {
    console.error("Generate Smart Answer Error:", error);
    return "Şu an sistemsel bir yoğunluk var, lütfen biraz sonra tekrar deneyiniz.";
  }
}