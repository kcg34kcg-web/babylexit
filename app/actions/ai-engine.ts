'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Cevapları denetleyen ve 2 paragraf yorum yazan fonksiyon
export async function analyzeAnswer(answerId: string, content: string, questionTitle: string) {
// cookies() fonksiyonunu await ederek çağırıyoruz (Next.js 15 kuralı)
const cookieStore = await cookies();
const supabase = await createClient(); // createClient kendi içinde cookies'i kullanır
  const prompt = `
    Sen "Babylexit" hukuk platformunda uzman bir Türk hukukçususun.
    SORU: "${questionTitle}"
    KULLANICI CEVABI: "${content}"
    
    GÖREVİN:
    1. Cevabı hukuki doğruluk açısından 0-100 arası puanla.
    2. Cevaba dair ekleme veya düzeltme yap.
    3. ÖNEMLİ: Yazacağın yorum MAKSİMUM 2 PARAGRAF olmalı. Profesyonel ve yapıcı ol.
    
    YANITI ŞU JSON FORMATINDA VER: {"score": 85, "critique": "Paragraf 1... \n\n Paragraf 2..."}
  `;

  try {
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text().replace(/```json|```/g, ""));

    await supabase.from('answers').update({ 
      ai_score: data.score, 
      ai_critique: data.critique 
    }).eq('id', answerId);

    return { success: true };
  } catch (error) {
    console.error("AI Error:", error);
    return { success: false };
  }
}