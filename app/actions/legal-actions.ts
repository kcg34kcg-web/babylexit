'use server';

import { createClient } from "@/utils/supabase/server";
import { generateAILegalNote, rateUserAnswer } from "@/utils/ai-service";
import { revalidatePath } from "next/cache";

// 👇 DÜZELTME: Tipi artık ortak dosyadan alıyoruz
// Eğer dosyanızın yeri farklıysa yolu ona göre düzenleyin (örn: "@/types/index")
// Klasör adı 'types', dosya adı da 'types' olduğu için böyle yazmalısınız:
import { FlatComment } from "../types/types";

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

  // AI Analizini Başlat
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

  // AI Puanlama
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

// NOT: FlatComment tipi artık "@/types" dosyasından geliyor.
// Buradaki eski tanımı sildik.

/**
 * Bir postun yorumlarını çeker.
 */
export async function getPostComments(postId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("comments_with_stats")
    .select("*")
    .eq("post_id", postId);

  if (error) {
    console.error("Yorumlar çekilirken hata oluştu:", error);
    return [];
  }

  return data as FlatComment[];
}