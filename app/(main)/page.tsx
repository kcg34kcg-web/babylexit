// Dosya: app/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const supabase = await createClient();
  
  // Kullanıcı giriş yapmış mı kontrol et
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Giriş yapmışsa Dashboard'a git
    redirect("/dashboard");
  } else {
    // Yapmamışsa Login'e git
    redirect("/login");
  }
}