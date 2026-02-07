import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FolderOpen, ArrowRight } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Favorilenmiş soruları çek
  const { data: favorites } = await supabase
    .from("favorites")
    .select(`
      id,
      created_at,
      questions (
        id,
        title,
        content,
        created_at,
        users (
            full_name,
            avatar_url
        )
      )
    `)
    .eq("user_id", user.id)
    .not("questions", "is", null) 
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-6 px-4">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        
        {/* --- DÜZELTME BURADA YAPILDI --- */}
        {/* href="/main" yerine href="/dashboard" yazıldı */}
        <Link href="/dashboard" className="p-2 bg-white rounded-full border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
            <ChevronLeft size={20} className="text-gray-600"/>
        </Link>
        {/* ------------------------------- */}

        <div>
           <h1 className="text-xl font-bold text-gray-800">Favoriler Dosyası</h1>
           <p className="text-xs text-gray-500">Toplam {favorites?.length || 0} içerik saklandı</p>
        </div>
      </div>

      <div className="space-y-3">
        {favorites && favorites.length > 0 ? (
          favorites.map((fav: any) => {
            const question = fav.questions;
            if (!question) return null;

            return (
              <Link key={fav.id} href={`/questions/${question.id}`} className="block group">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-orange-200 transition-all relative">
                   
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                            {question.users?.avatar_url && <img src={question.users.avatar_url} className="w-full h-full object-cover"/>}
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{question.users?.full_name || "Anonim"}</span>
                      </div>
                      
                      <FavoriteButton itemId={question.id} initialIsFavorited={true} type="question" />
                   </div>

                   <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2">
                      {question.title || question.content}
                   </h3>
                   
                   <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-gray-400">
                        {new Date(question.created_at).toLocaleDateString("tr-TR")} tarihinde eklendi
                      </span>
                      <div className="bg-orange-50 p-1.5 rounded-full group-hover:bg-orange-100 transition-colors">
                         <ArrowRight size={14} className="text-orange-500"/>
                      </div>
                   </div>

                </div>
              </Link>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="bg-gray-100 p-6 rounded-full mb-4">
                <FolderOpen size={40} className="text-gray-400" />
             </div>
             <h3 className="text-lg font-bold text-gray-700">Dosya Boş</h3>
             <p className="text-gray-500 text-sm max-w-[200px] mt-2">
                Henüz favorilenmiş içerik yok.
             </p>
             <Link href="/dashboard" className="mt-6 text-orange-500 font-bold text-sm bg-orange-50 px-6 py-3 rounded-xl hover:bg-orange-100 transition-colors">
                Gündeme Dön
             </Link>
          </div>
        )}
      </div>

    </div>
  );
}