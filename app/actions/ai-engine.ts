'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";
import { redis } from "@/lib/redis";
// 1. GÜNCELLEME: Ödül sistemi yerine yeni Repütasyon sistemini import ediyoruz
import { addReputation } from "./reputation"; 
import { aiOrchestrator } from "@/lib/ai/orchestrator";

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

const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });


// =========================================================
// KATMAN 0-A: GÜVENLİK VE GİRİŞ KONTROLÜ
// =========================================================
const BAD_PATTERNS = [
  /küfür|hakaret|aptal|gerizekalı/i, 
  /prompt injection|ignore previous/i, 
  /sadasd|asdasd|123123/i 
];

function isBasicContentSafe(text: string): { isSafe: boolean; reason?: string } {
  const lowerText = text.toLowerCase().trim();
  
  if (lowerText.length < 3) {
    return { isSafe: false, reason: "Lütfen en az 3 harfli, anlamlı bir soru sorunuz." };
  }

  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(lowerText)) {
      return { isSafe: false, reason: "Mesajınız topluluk kurallarına aykırı ifadeler veya geçersiz içerik barındırıyor." };
    }
  }

  return { isSafe: true };
}

// =========================================================
// KATMAN 0-B: YEREL KURALLAR (ROUTER)
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
  for (const rule of STATIC_RULES) {
    if (rule.keywords.some(k => lowerText === k || (lowerText.includes(k) && lowerText.length < 30))) {
      return rule.response;
    }
  }
  return null;
}

// =========================================================
// YARDIMCI: LOGLAMA SİSTEMİ
// =========================================================
async function logAIAction(source: string, costSaved: boolean, startTime: number) {
  (async () => {
    try {
      const duration = Date.now() - startTime;
      const supabase = await createClient();
      await supabase.from('ai_logs').insert({
        source: source,          
        cost_saved: costSaved,   
        latency_ms: duration,    
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("AI Log Error:", error);
    }
  })();
}

// =========================================================
// YARDIMCI: LLM BAZLI GÜVENLİK KONTROLÜ
// =========================================================
export async function checkContentSafety(text: string) {
  const prompt = `
    Sen "Babylexit" hukuk ve topluluk platformunun içerik moderatörüsün.
    Aşağıdaki metni analiz et.
    METİN: "${text}"
    KRİTERLER:
    - Küfür, ağır hakaret, aşağılama var mı?
    - Açıkça şiddet tehdidi veya fiziksel zarar verme isteği var mı?
    - Yasadışı faaliyetlere teşvik var mı?
    YANIT FORMATI (JSON):
    { "isSafe": boolean, "reason": "string" }
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

// =========================================================
// VEKTÖR OLUŞTURMA (MERKEZİ)
// =========================================================
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

// =========================================================
// KATMAN 0-C: HAFIZA ARAMALARI (RAG & COMMUNITY)
// =========================================================

async function searchVectorDB(embedding: number[]) {
  const supabase = await createClient();
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

// 2. GÜNCELLEME: Repütasyon Tetikleyicisi Burada
async function searchCommunityQuestions(embedding: number[]) {
  const supabase = await createClient();
  const { data: similarQuestions, error } = await supabase.rpc('match_community_questions', {
    query_embedding: embedding,
    match_threshold: 0.90, 
    match_count: 1
  });

  if (error) return null;

  if (similarQuestions && similarQuestions.length > 0) {
    const similarQ = similarQuestions[0];
    
    // Şema kontrolü: 'author_id' yerine 'user_id' kullanıldı (Database standardı)
    const { data: bestAnswer } = await supabase
      .from('answers')
      .select('content, user_id, question_id') 
      .eq('question_id', similarQ.id)
      .order('vote_count', { ascending: false }) // Not: Eğer 'vote_count' sütunu yoksa 'created_at' kullanın
      .limit(1)
      .maybeSingle();

    if (bestAnswer) {
      console.log(`👥 COMMUNITY HIT: "${similarQ.title}" bulundu.`);
      
      // --- AI ENDORSEMENT (OTORİTE PUANI) ---
      // Cevap sahibine 'AI_REFERENCE' (50 Puan) veriyoruz
      if (bestAnswer.user_id) {
        console.log(`🤖 AI Referans Tespit Etti: User ${bestAnswer.user_id}`);
        
        // Asenkron olarak puanı işle (Kullanıcıyı bekletme)
        addReputation(bestAnswer.user_id, 'AI_REFERENCE', bestAnswer.question_id)
          .catch(err => console.error("Repütasyon (AI Reference) hatası:", err));
      }

      return `**(Topluluk Arşivinden)**\n\nBu soru daha önce topluluğumuzda sorulmuştu. İşte topluluktan en çok beğenilen cevap:\n\n---\n${bestAnswer.content}\n---`;
    }
  }
  return null;
}

// =========================================================
// ANA FONKSİYON: TAM ENTEGRE SİSTEM
// =========================================================
export async function generateSmartAnswer(questionTitle: string, questionContent: string) {
  const start = Date.now(); 
  const fullQuestion = `${questionTitle} ${questionContent}`;
  const cleanQuestion = fullQuestion.trim();
  const cacheKey = `smart_answer:${questionTitle.trim().toLowerCase().replace(/\s+/g, '_')}`;

  // 1. ADIM: REGEX GÜVENLİK
  const basicSafety = isBasicContentSafe(cleanQuestion);
  if (!basicSafety.isSafe) {
     logAIAction('security_block', true, start);
     return `⚠️ ${basicSafety.reason}`;
  }

  // 2. ADIM: ROUTER
  const staticAnswer = checkLocalRules(cleanQuestion);
  if (staticAnswer) {
    console.log("🚦 ROUTER HIT");
    logAIAction('router', true, start); 
    return staticAnswer;
  }

  // 3. ADIM: AKILLI REDIS ÖNBELLEK
  try {
    const cachedRaw = await redis.get(cacheKey);
    if (cachedRaw) {
      let finalAnswer = "";
      try {
        const cachedObj = JSON.parse(cachedRaw);
        if (cachedObj && cachedObj.content) {
             finalAnswer = cachedObj.content; 
             console.log(`⚡ CACHE HIT: ${cachedObj.provider || 'Bilinmeyen'} kaynağından geldi.`);
        } else {
             finalAnswer = cachedRaw;
        }
      } catch {
        finalAnswer = cachedRaw; 
      }
      logAIAction('redis', true, start); 
      return finalAnswer;
    }
  } catch (e) {
    console.warn("Redis bağlantı hatası (Cache atlandı).", e);
  }

  // 4. ADIM: EMBEDDING ÜRETİMİ
  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(fullQuestion);
  } catch (e) { console.error("Embedding hatası:", e); }

  // 5. ADIM: HAFIZA TARAMASI (RAG)
  if (embedding) {
      // a) Toplulukta var mı? (BURADA PUANLAMA YAPILIYOR)
      const communityAnswer = await searchCommunityQuestions(embedding);
      if (communityAnswer) {
        await redis.set(cacheKey, communityAnswer, 'EX', 86400);
        logAIAction('community', true, start); 
        return communityAnswer;
      }

      // b) Vektör veritabanında var mı?
      const vectorAnswer = await searchVectorDB(embedding);
      if (vectorAnswer) {
        await redis.set(cacheKey, vectorAnswer, 'EX', 86400);
        logAIAction('vector', true, start); 
        return vectorAnswer;
      }
  }

  // ---------------------------------------------------------
  // 6. ADIM: AI ORCHESTRATOR
  // ---------------------------------------------------------
  
  const safetyCheck = await checkContentSafety(fullQuestion);
  if (!safetyCheck.isSafe) {
    return `⚠️ Üzgünüm, sorunuzu yanıtlayamıyorum. ${safetyCheck.reason}`;
  }

  const customContext = `
### ÖZEL GÖREV TALİMATLARI ###
Sen "Babylexit" platformunun **Omni-Adaptive Intelligence Engine** modülüsün.
Tarih: ${new Date().toLocaleDateString('tr-TR')}

GÖREVLER:
1. **ALAN TESPİTİ:** Soru HUKUK ile ilgiliyse "Kıdemli Hukuk Asistanı" moduna geç. Diğer konularda "Uzman Danışman" moduna geç.
2. **FORMAT:** Maksimum 2 paragraf. Dolgu kelimeler yok.
3. **HUKUK MODU:** Yürürlükteki Türk kanunlarını esas al. "TBK m. 112" gibi atıflar yap. Sonuna mutlaka "⚖️ *Yasal Uyarı: Bu bilgi hukuki mütalaa değildir.*" ekle.
4. **SAĞLIK MODU:** Mutlaka "Doktor değilim" uyarısı ekle.
`;

  try {
    const aiResult = await aiOrchestrator.getAnswer(fullQuestion, customContext);
    let textAnswer = aiResult.content;
    
    if (fullQuestion.toLowerCase().includes("hukuk") || fullQuestion.toLowerCase().includes("dava") || fullQuestion.toLowerCase().includes("ceza")) {
        if (!textAnswer.includes("Yasal Uyarı")) {
            textAnswer += "\n\n> ⚖️ *Yasal Uyarı: Bu cevap yapay zeka tarafından oluşturulmuştur ve hukuki tavsiye niteliği taşımaz.*";
        }
    }

    // --- KAYIT İŞLEMLERİ ---
    await redis.set(cacheKey, JSON.stringify({
        content: textAnswer,
        provider: aiResult.provider, 
        timestamp: Date.now()
    }), 'EX', 86400);

    console.log(`✅ YENİ CEVAP: ${aiResult.provider} tarafından üretildi.`);

    if (embedding) {
        (async () => {
          try {
              const supabase = await createClient();
              await supabase.from('ai_knowledge_base').insert({
                question_text: fullQuestion,
                answer_text: textAnswer,
                embedding: embedding,
                provider: aiResult.provider 
              });
              console.log(`💾 KNOWLEDGE SAVED: Yeni bilgi (${aiResult.provider}) veritabanına işlendi.`);
          } catch (dbError) {
            console.error("Vector DB save error (Background):", dbError);
          }
        })();
    }

    logAIAction(aiResult.provider.toLowerCase(), false, start); 
    return textAnswer; 

  } catch (error: any) {
    console.error("Generate Smart Answer Error:", error);
    return "Şu an sistemsel bir yoğunluk var, lütfen biraz sonra tekrar deneyiniz.";
  }
}

// ---------------------------------------------------------
// EXTRA: CEVAP ANALİZİ
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
    4. Yorumun MAKSİMUM 2 PARAGRAF olsun.
    YANIT FORMATI (JSON): 
    {"score": 85, "critique": "Yorum..."}
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