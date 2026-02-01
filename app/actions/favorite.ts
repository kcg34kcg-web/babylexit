"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleFavoriteAction(itemId: string, type: 'question' | 'answer') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız" };

  // Önce bu öğe zaten favori mi diye kontrol et
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq(type === 'question' ? "question_id" : "answer_id", itemId)
    .single();

  if (existing) {
    // Varsa sil (Favoriden çıkar)
    await supabase.from("favorites").delete().eq("id", existing.id);
  } else {
    // Yoksa ekle (Favoriye al)
    await supabase.from("favorites").insert({
      user_id: user.id,
      [type === 'question' ? "question_id" : "answer_id"]: itemId,
    });
  }

  // Sayfayı yenile ki UI güncellensin
  revalidatePath("/main");
  revalidatePath("/favorites");
  revalidatePath(`/questions/${itemId}`);
  
  return { isFavorited: !existing };
}