'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function voteAction(answerId: string, voteType: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız." };

  const { error } = await supabase.rpc('vote_answer', {
    p_answer_id: answerId,
    p_user_id: user.id,
    p_vote_type: voteType
  });

  if (error) return { error: "Oylama başarısız." };

  revalidatePath(`/questions/${answerId}`);
  return { success: true };
}