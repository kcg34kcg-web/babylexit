'use server';

import { createClient } from "@/utils/supabase/server";
import { redis } from "@/lib/redis";
import { revalidatePath } from "next/cache";

export async function rateAIResponse(questionTitle: string, isHelpful: boolean) {
  const supabase = await createClient();
  const cacheKey = `smart_answer:${questionTitle.trim().toLowerCase().replace(/\s+/g, '_')}`;

  // 1. Veritabanında (Knowledge Base) ilgili cevabı bul ve puanını artır
  // Not: Burada eşleştirmeyi soru metni üzerinden yapıyoruz
  // (Daha hassas olması için 'question_text' yerine hash veya ID kullanılabilir ama şimdilik bu yeterli)
  if (isHelpful) {
    await supabase.rpc('increment_helpful', { q_text: questionTitle }); // Bu RPC'yi aşağıda tanımlayacağız veya direkt update yapabiliriz:
    
    // Basit SQL update yöntemi:
    const { data } = await supabase
      .from('ai_knowledge_base')
      .select('id, helpful_count')
      .textSearch('question_text', questionTitle) // Basit arama
      .limit(1)
      .single();
      
    if (data) {
      await supabase.from('ai_knowledge_base')
        .update({ helpful_count: data.helpful_count + 1 })
        .eq('id', data.id);
    }

  } else {
    // 2. EĞER CEVAP KÖTÜYSE (Not Helpful)
    
    // a) Veritabanında "kötü" sayacını artır
    const { data } = await supabase
      .from('ai_knowledge_base')
      .select('id, not_helpful_count')
      .textSearch('question_text', questionTitle)
      .limit(1)
      .single();

    if (data) {
      await supabase.from('ai_knowledge_base')
        .update({ not_helpful_count: data.not_helpful_count + 1 })
        .eq('id', data.id);
        
      // b) KRİTİK HAMLE: Kötü cevap redis'ten silinmeli! 
      // Böylece bir sonraki kullanıcıya bu kötü cevap gösterilmez, Gemini yeni cevap üretir.
      console.log(`🗑️ BAD FEEDBACK: Önbellek temizleniyor... (${cacheKey})`);
      await redis.del(cacheKey);
    }
  }

  return { success: true };
}