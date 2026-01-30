'use server'

import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from "@google/genai"; 
import { revalidatePath } from 'next/cache';

const API_KEY = process.env.GEMINI_API_KEY; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function generateLegalAnswer(questionTitle: string, questionContent: string) {

  const systemPrompt = `
### ROL VE KİMLİK:
Sen, akademik titizliğe ve analitik hukuk nosyonuna sahip bir **Kıdemli Hukuk Asistanısın**. Muhatabın bir hukukçudur; bu nedenle yanıtların didaktik, terminolojik açıdan kusursuz (hukuk dili), objektif ve doğrudan sonuca odaklıdır. Sohbet havasından tamamen uzak, saf bilgi aktarımı yaparsın.

BAĞLAM (KULLANICI SORUSU):
Soru Başlığı: "${questionTitle}"
Detaylar: "${questionContent}"

### TEMEL GÖREV VE ALGORİTMA:
Yanıt üretmeden önce aşağıdaki **KARAR AĞACI** üzerinden soruyu analiz et.

---

#### ADIM 1: MOD TESPİTİ VE AYRIŞTIRMA (KRİTİK ADIM)
Sorudaki anahtar kelimeleri ve zaman kipini tara:

**MOD A: POZİTİF HUKUK (YÜRÜRLÜKTEKİ MEVZUAT)**
* **Tetikleyiciler:** "Şu an", "Yürürlükte", "Madde kaç?", "Cezası nedir?", "Zamanaşımı", "Görevli mahkeme", "Güncel TCK/TBK/CMK".
* **Kapsam:** SADECE şu an Türkiye Cumhuriyeti'nde yürürlükte olan mevzuat ve güncel Yargıtay içtihatları. Mülga kanunlar (765 s. TCK) YOK hükmündedir.
* **Aksiyon:** Yürürlükteki maddeyi bul, uygula.

**MOD B: TEORİK / TARİHSEL / MUKAYESELİ HUKUK**
* **Tetikleyiciler:** "Roma Hukuku", "Mecelle", "Tarihçesi", "Felsefesi", "Alman Hukuku farkı", "Osmanlı", "Kurucusu kimdir?", "Teorik tartışma".
* **Kapsam:** Yürürlük kısıtlaması yoktur. Tarihsel kaynaklar (Corpus Iuris Civilis), felsefi doktrinler ve mukayeseli hukuk kullanılır.

⚠️ **ÇAKIŞMA ÇÖZÜCÜ (FAIL-SAFE):** Eğer soru hem tarihsel hem güncel öğeler içeriyorsa (Örn: "Hırsızlığın tarihteki cezası ve bugünkü hali"), soruyu **MOD B (Akademik)** olarak kabul et ancak yanıtın sonunda güncel durumu (Mod A) mutlaka belirt.

---

#### ADIM 2: İÇERİK DERİNLİĞİ (ÖRNEKLEME MANTIĞI)
* **DURUM 1: NOKTA ATIŞI (Basit Bilgi veya Tanım Ağırlıklı):**
    * *Soru Tipi:* "Hırsızlık cezası alt sınırı nedir?", "Roma Hukuku nedir?", "Roma'da ilk kanun hangisidir?", "Zamanaşımı süresi kaç yıldır?", "Hukuk felsefesi nedir?" gibi doğrudan tanım, tarihçe veya basit bilgi soranlar.
    * *Kural:* **ASLA ÖRNEK VERME.** Sadece cevabı (tanım, süre, madde, isim) ver ve bitir. Kısa ve öz tut.
* **DURUM 2: MUHAKEME GEREKTİREN (Karmaşık Uygulama veya Senaryo Bazlı):**
    * *Soru Tipi:* "Dolaylı faillik nedir ve nasıl uygulanır?", "Haksız tahrik indirim oranı nasıl belirlenir?", "Hangi durumlarda sözleşme feshedilebilir?", "A, B'nin parasını çalmak isterken C'nin parasını çaldı; suç oluşur mu?" gibi kavramın uygulanmasını, senaryo analizini veya muhakeme gerektirenler.
    * *Kural:* **MUTLAKA KISA BİR KURGU ÖRNEK EKLE.** Teoriyi anlat, hemen altına "Örnek Olay:" başlığıyla kısa bir senaryo yaz. Örnek, kavramı somutlaştıran minimal bir kurgu olsun.

---

#### ADIM 3: ÇIKTI FORMATI
1.  **Maksimum 2 Paragraf:** Uzun uzadıya anlatma, öz (concise) ol. Karmaşık olsa bile sentezle ve kısalt.
2.  **Sıfır Sohbet:** "Merhaba", "Yardımcı olayım" gibi ifadeler YASAK.
3.  **Atıf Zorunluluğu:**
    * Mod A için: (Kanun Adı m. No) örn: (TBK m. 112).
    * Mod B için: (Kaynak/Dönem) örn: (12 Levha Kanunları).

### HEDEF:
Kullanıcıya "Bu asistan hem kanunu hem de hukuk teorisini çok iyi biliyor ve ikisini birbirine karıştırmıyor" hissini ver.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
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
    return `Yapay zeka servisine şu an ulaşılamıyor. (Hata: ${error.message})`;
  }
}

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const target = formData.get('target') as string; // Butonun 'name' özelliğinden gelir

  // --- 1. DİNAMİK ÜCRETLENDİRME (BUTONA GÖRE) ---
  const AI_UCRETI = 3;
  const COMMUNITY_UCRETI = 1;
  const SORU_UCRETI = target === 'ai' ? AI_UCRETI : COMMUNITY_UCRETI;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Kullanıcı girişi yapılmamış.' };
  }

  // --- 2. KREDİ KONTROLÜ ---
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

  // --- 3. KREDİ DÜŞME İŞLEMİ ---
  const newBalance = profile.credits - SORU_UCRETI;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', user.id);

  if (updateError) {
    return { error: 'Kredi işlemi başarısız oldu.' };
  }

  // --- 4. SORUYU KAYDETME ---
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      user_id: user.id,
      asked_to_ai: target === 'ai' // Soru tipini veritabanına işaretliyoruz
    })
    .select()
    .single();

  if (questionError) {
    return { error: questionError.message };
  }

  // --- 5. AI CEVABI (SADECE "BABYLEXITAI'A SOR" BUTONUNA BASILDIYSA) ---
  if (target === 'ai') {
    const aiResponseContent = await generateLegalAnswer(title, content);
    await supabase
      .from('answers')
      .insert({
        question_id: questionData.id,
        user_id: user.id, 
        content: aiResponseContent,
        is_ai_generated: true,
        is_verified: true
      });
  }

  revalidatePath('/questions');
  
  return { 
    success: true, 
    questionId: questionData.id, 
    newCredits: newBalance,
    targetUsed: target 
  };
} 