'use server'

import { createClient } from '@/utils/supabase/server';
import { generateAILegalNote, rateUserAnswer } from '@/utils/ai-service';
import { revalidatePath } from 'next/cache';

export async function processAIAnalysis(questionId: string, title: string, content: string) {
  const supabase = await createClient();

  // 1. AI Notu Üret
  const aiNote = await generateAILegalNote(title, content);

  // 2. Veritabanına Kaydet
  const { error } = await supabase
    .from('questions')
    .update({ ai_response: aiNote })
    .eq('id', questionId);

  if (error) console.error("AI Kayıt Hatası:", error);
  
  revalidatePath(`/questions/${questionId}`);
}