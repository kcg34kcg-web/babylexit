'use server';

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { generateAILegalNote, rateUserAnswer } from "@/utils/ai-service";
import { revalidatePath } from "next/cache";

/**
 * Yeni bir soru oluşturur ve AI analizini başlatır.
 */
export async function createQuestionAction(formData: FormData) {
  // Next.js 15'te cookies() await edilmelidir. 
  // createClient fonksiyonun muhtemelen bunu içeride hallediyor, 
  // ama en güvenli standart kullanımı budur:
  const supabase = await createClient();

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // 1. Soruyu veritabanına kaydet
  const { data: question, error } = await supabase
    .from('questions')
    .insert([{ 
      title, 
      content,
      ai_status: 'pending' // İşlem başladığı için pending olarak işaretliyoruz
    }])
    .select()
    .single();

  if (error || !question) return { error: "Soru kaydedilemedi." };

  // 2. Arka planda AI analizini tetikle
  // Not: aiNote zaten { summary, laws, disclaimer } objesi döndürdüğü için 
  // doğrudan ai_response'a eşitliyoruz.
  generateAILegalNote(title, content).then(async (aiNote) => {
    await supabase
      .from('questions')
      .update({ 
        ai_response: aiNote, // { summary: aiNote } yaparsak veriyi iç içe gömer, doğrusu bu.
        ai_status: 'completed' 
      })
      .eq('id', question.id);
  }).catch(async () => {
    await supabase.from('questions').update({ ai_status: 'failed' }).eq('id', question.id);
  });

  revalidatePath('/questions');
  return { success: true, id: question.id };
}

/**
 * Bir cevabı kaydeder ve AI tarafından puanlanmasını sağlar.
 */
export async function submitAnswerAction(questionId: string, questionContent: string, answerContent: string) {
  const supabase = await createClient();

  // 1. Cevabı kaydet
  const { data: answer, error } = await supabase
    .from('answers')
    .insert([{ 
      question_id: questionId, 
      content: answerContent 
    }])
    .select()
    .single();

  if (error || !answer) return { error: "Cevap gönderilemedi." };

  // 2. AI Puanlamasını yap
  try {
    const aiReview = await rateUserAnswer(questionContent, answerContent);
    
    // SQL şemanda 'ai_critique' olarak belirlediğin sütuna aiReview içindeki 'feedback'i yazıyoruz.
    await supabase
      .from('answers')
      .update({
        ai_score: aiReview.score,
        ai_critique: aiReview.feedback, 
      })
      .eq('id', answer.id);

  } catch (err) {
    console.error("AI Puanlama hatası:", err);
    // Answers tablosunda ai_status sütunu eklemediysen bu satırı silebilirsin.
  }

  revalidatePath(`/questions/${questionId}`);
  return { success: true };
}