'use server';

import { createClient } from '@/utils/supabase/server';
import { generateEmbedding } from './ai-engine';

// ---------------------------------------------------------
// 1. SORU SORMA SAYFASI İÇİN (HİBRİT ARAMA: Text + AI)
// ---------------------------------------------------------
export async function suggestSimilarQuestions(query: string) {
  // Kullanıcı çok az yazdıysa yormayalım
  if (!query || query.length < 2) return [];

  const supabase = await createClient();
  let finalResults: any[] = [];

  // --- A. ADIM: KLASİK METİN ARAMASI (GARANTİ YÖNTEM) ---
  // Direkt 'questions' tablosuna gidip "başlıkta veya içerikte bu kelime var mı?" diye bakar.
  const { data: textData, error: textError } = await supabase
    .from('questions')
    .select('id, title, content')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`) // Başlık VEYA İçerik ara
    .limit(3);

  if (!textError && textData) {
    // Bulunanları listeye ekle (Benzerlik puanını manuel 1.0 yapıyoruz ki en üstte çıksın)
    const formattedTextData = textData.map(q => ({
      ...q,
      similarity: 1.0 
    }));
    finalResults = [...formattedTextData];
  }

  // --- B. ADIM: YAPAY ZEKA VEKTÖR ARAMASI (AKILLI YÖNTEM) ---
  // Mevcut kodlarını koruyoruz, sadece hata olursa sistemi durdurmamasını sağlıyoruz.
  try {
    const embedding = await generateEmbedding(query);
    
    if (embedding) {
      const { data: vectorData, error: vectorError } = await supabase.rpc('match_questions', {
        query_embedding: embedding,
        match_threshold: 0.5, // %50 benzerlik (Yapay zeka için ideal)
        match_count: 3
      });

      if (!vectorError && vectorData) {
        finalResults = [...finalResults, ...vectorData];
      }
    }
  } catch (err) {
    console.error("AI Arama Hatası (Önemli değil, klasik arama çalıştı):", err);
  }

  // --- C. ADIM: ÇİFT KAYITLARI TEMİZLE ---
  // Hem klasik hem AI aynı soruyu bulduysa listede iki kere görünmesin.
  const uniqueResults = Array.from(new Map(finalResults.map(item => [item.id, item])).values());

  return uniqueResults.map((q: any) => ({
    id: q.id,
    title: q.title,
    content: q.content,
    similarity: q.similarity || 0.5
  }));
}

// ---------------------------------------------------------
// 2. DASHBOARD / GLOBAL ARAMA (Aynı mantığı kullanabilir)
// ---------------------------------------------------------
export async function searchGlobalQuestions(query: string) {
  // Dashboard araması için de aynı güçlü fonksiyonu kullanıyoruz
  return suggestSimilarQuestions(query);
}