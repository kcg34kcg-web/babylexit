'use server'

import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateLegalAnswer(questionTitle: string, questionContent: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const systemPrompt = `
    You are an expert Professor of Turkish Law. Answer the user's question based strictly on current Turkish laws (e.g., TMK, TBK, TCK) and up-to-date legal resources.
    
    CONTEXT:
    Question: "${questionTitle}"
    Details: "${questionContent}"

    RULES:
    - Do not hallucinate. If you don't know, state it clearly.
    - Cite specific Article numbers (Madde no) for every legal claim.
    - Limit your answer to 1-2 paragraphs maximum.
    - Tone: Professional, Academic, and Neutral.
    - Language: Turkish.
  `;

  try {
    const result = await model.generateContent(systemPrompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Şu anda yapay zeka hukuk görüşü oluşturulamadı. Lütfen topluluk cevaplarını bekleyiniz.";
  }
}

export async function submitQuestion(formData: FormData) {
  const supabase = await createClient();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Insert User Question
  const { data: questionData, error: questionError } = await supabase
    .from('questions')
    .insert({
      title,
      content,
      user_id: user.id
    })
    .select()
    .single();

  if (questionError) throw new Error(questionError.message);

  // 3. Trigger AI Agent (Parallel execution is optional, here we await for immediate result)
  const aiResponseContent = await generateLegalAnswer(title, content);

  // 4. Insert AI Answer with is_ai_generated = true
  // We use the same user_id for the AI answer, or you can create a specific 'AI System User' in your DB
  await supabase
    .from('answers')
    .insert({
      question_id: questionData.id,
      user_id: user.id, // Or a dedicated system user ID
      content: aiResponseContent,
      is_ai_generated: true,
      is_verified: true // AI answers might be verified by default
    });

  revalidatePath('/questions');
  redirect(`/questions/${questionData.id}`);
}