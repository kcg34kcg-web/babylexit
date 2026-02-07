'use server';

import { createClient } from '@/utils/supabase/server';
import { generateEmbedding } from './ai-engine';

// =========================================================
// 1. ASK PAGE İÇİN: HIZLI ÖNERİ SİSTEMİ
// Amacı: Sadece başlıkları getirip "Bak bu soruldu" demek.
// =========================================================
export async function suggestSimilarQuestions(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();
  let finalResults: any[] = [];

  // A. KLASİK ARAMA (Başlıkta ara)
  const { data: textData } = await supabase
    .from('questions')
    .select('id, title, content')
    .ilike('title', `%${query}%`)
    .limit(3);

  if (textData) {
    finalResults = textData.map(q => ({ ...q, similarity: 1.0 }));
  }

  // B. AI ARAMA (Anlamsal)
  try {
    const embedding = await generateEmbedding(query);
    if (embedding) {
      const { data: vectorData } = await supabase.rpc('match_questions', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 3
      });
      if (vectorData) finalResults = [...finalResults, ...vectorData];
    }
  } catch (e) { console.error(e); }

  // C. BİRLEŞTİR VE DÖNDÜR
  const uniqueResults = Array.from(new Map(finalResults.map(item => [item.id, item])).values());
  
  return uniqueResults.map((q: any) => ({
    id: q.id,
    title: q.title,
    content: q.content,
    similarity: q.similarity || 0.5
  }));
}

// =========================================================
// 2. DASHBOARD İÇİN: DETAYLI GLOBAL ARAMA (DÜZELTİLDİ!)
// Amacı: Profil resmi, cevap sayısı, tarih vb. HER ŞEYİ getirmek.
// =========================================================
export async function searchGlobalQuestions(query: string) {
  if (!query) return [];

  const supabase = await createClient();
  let questionIds = new Set<string>();

  // --- ADIM 1: AI İLE ID'LERİ BUL ---
  // Önce yapay zeka ile mantıklı soruların ID'lerini alıyoruz
  try {
    const embedding = await generateEmbedding(query);
    if (embedding) {
      const { data: vectorData } = await supabase.rpc('match_questions', {
        query_embedding: embedding,
        match_threshold: 0.5, 
        match_count: 10
      });
      if (vectorData) {
        vectorData.forEach((q: any) => questionIds.add(q.id));
      }
    }
  } catch (e) { console.error("AI Arama Hatası:", e); }

  // --- ADIM 2: ID LİSTESİNİ VE KLASİK ARAMAYI BİRLEŞTİRİP DETAYLARI ÇEK ---
  // Burası çok önemli: Dashboard'un ihtiyaç duyduğu profiles ve answers verilerini çekiyoruz.
  
  let queryBuilder = supabase
    .from('questions')
    .select(`
      *,
      profiles (full_name, avatar_url),
      answers (count)
    `)
    .order('created_at', { ascending: false });

  // Eğer AI sonuç bulduysa veya kullanıcı metin girdiyse filtrele
  if (questionIds.size > 0) {
    // Hem AI'ın bulduklarını (ID ile) HEM DE içinde kelime geçenleri (OR ile) getir
    const idsString = Array.from(questionIds).join(',');
    // Mantık: (ID listesindeyse) VEYA (Başlık/İçerik metni içeriyorsa)
    queryBuilder = queryBuilder.or(`id.in.(${idsString}),title.ilike.%${query}%,content.ilike.%${query}%`);
  } else {
    // AI bulamadıysa sadece metin araması yap
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
  }

  const { data, error } = await queryBuilder.limit(20);

  if (error) {
    console.error("Dashboard Arama Hatası:", error);
    return [];
  }

  return data;
}