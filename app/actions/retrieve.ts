'use server'

import { createClient } from '@/utils/supabase/server'

// Ortam değişkeninden adresi al
const PYTHON_API_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  similarity: number;
}

export async function searchKnowledgeBase(query: string): Promise<SearchResult[]> {
  const supabase = await createClient()

  try {
    // 1. Python Servisinden Embedding İste (Vektörleştirme)
    const embedResponse = await fetch(`${PYTHON_API_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
      cache: 'no-store'
    });

    if (!embedResponse.ok) {
      console.warn("⚠️ Python API Erişilemedi (Local AI Kapalı Olabilir).");
      return []; 
    }

    const { embedding } = await embedResponse.json();

    // 2. Supabase RPC ile Vektör Araması Yap
    // match_documents fonksiyonunu SQL ile oluşturmuştuk (Katman 2 başı)
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.50, // Benzerlik eşiği
      match_count: 5 // En alakalı 5 parça
    });

    if (error) {
      console.error("Supabase Arama Hatası:", error);
      return [];
    }

    return documents || [];

  } catch (err) {
    console.error("Bilgi Bankası Arama Hatası:", err);
    return [];
  }
}