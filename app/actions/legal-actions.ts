'use server';

import { createClient } from "@/utils/supabase/server";
import { generateAILegalNote, rateUserAnswer } from "@/utils/ai-service";
import { revalidatePath } from "next/cache";

// 👇 FIX: Using the absolute path alias (@) is safer than relative paths (../)
// Ensure your file is located at 'src/types/types.ts' or 'app/types/types.ts'
import { FlatComment } from "@/app/types";/* ============================================================
   ========================================================== */

export async function createQuestionAction(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const { data: question, error } = await supabase
    .from('questions')
    .insert([{ 
      title, 
      content,
      ai_status: 'pending' 
    }])
    .select()
    .single();

  if (error || !question) return { error: "Soru kaydedilemedi." };

  generateAILegalNote(title, content).then(async (aiNote) => {
    await supabase
      .from('questions')
      .update({ 
        ai_response: aiNote, 
        ai_status: 'completed' 
      })
      .eq('id', question.id);
  }).catch(async () => {
    await supabase.from('questions').update({ ai_status: 'failed' }).eq('id', question.id);
  });

  revalidatePath('/questions');
  return { success: true, id: question.id };
}

export async function submitAnswerAction(questionId: string, questionContent: string, answerContent: string) {
  const supabase = await createClient();

  const { data: answer, error } = await supabase
    .from('answers')
    .insert([{ 
      question_id: questionId, 
      content: answerContent 
    }])
    .select()
    .single();

  if (error || !answer) return { error: "Cevap gönderilemedi." };

  try {
    const aiReview = await rateUserAnswer(questionContent, answerContent);
    
    await supabase
      .from('answers')
      .update({
        ai_score: aiReview.score,
        ai_critique: aiReview.feedback, 
      })
      .eq('id', answer.id);

  } catch (err) {
    console.error("AI Puanlama hatası:", err);
  }

  revalidatePath(`/questions/${questionId}`);
  return { success: true };
}


/* ============================================================
   BÖLÜM 2: MÜZAKERE (COMMENT) SİSTEMİ
   ============================================================ */

/**
 * Bir postun yorumlarını çeker.
 * UPDATE (Phase 2): 10 yorum limitini kaldırmak için range() eklendi.
 */
export async function getPostComments(postId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("comments_with_stats")
    .select("*")
    // 👇 KRİTİK GÜNCELLEME: Tüm yorumları çekmek için limit artırıldı
    .eq("post_id", postId)
    .order('created_at', { ascending: true }) // Ağaç yapısı için kronolojik sıra önemli
    .range(0, 2000); // 10 yerine 2000 yoruma kadar çek

  if (error) {
    console.error("Yorumlar çekilirken hata oluştu:", error);
    return [];
  }

  return data as FlatComment[];
}