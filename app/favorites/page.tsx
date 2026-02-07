'use client';

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import moment from "moment";
import "moment/locale/tr";
import { 
  ChevronLeft, 
  FolderOpen, 
  ArrowRight, 
  Search, 
  Loader2, 
  Calendar,
  User,
  Star
} from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";

export default function FavoritesPage() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();
  const router = useRouter();

  // Verileri Çek
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: favs } = await supabase
        .from("favorites")
        .select(`
          id,
          created_at,
          questions (
            id,
            title,
            content,
            created_at,
            profiles (         
                full_name,
                avatar_url
            )
          )
        `)
        .eq("user_id", user.id)
        .not("questions", "is", null) 
        .order("created_at", { ascending: false });

      if (favs) setFavorites(favs);
      setLoading(false);
    };

    fetchData();
    moment.locale("tr");
  }, [supabase, router]);

  // Arama Filtreleme Mantığı
  const filteredFavorites = favorites.filter((fav) => {
    const q = fav.questions;
    if (!q) return false;
    const term = searchTerm.toLowerCase();
    return (
      q.title?.toLowerCase().includes(term) ||
      q.content?.toLowerCase().includes(term) ||
      q.profiles?.full_name?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-900 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* --- ÜST HEADER ALANI (LACİVERT & TURUNCU) --- */}
      <div className="bg-slate-900 pb-12 pt-8 px-4 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        
        {/* Arka plan dekorasyonu */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          
          {/* Geri Dön ve Başlık */}
          <div className="flex items-center gap-4 mb-8">
            <Link 
              href="/dashboard" 
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2.5 rounded-full text-white transition-all border border-white/10"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Favorilerim
              </h1>
              <p className="text-indigo-200 text-sm font-medium mt-1">
                Kaydettiğin {favorites.length} önemli içerik burada.
              </p>
            </div>
          </div>

          {/* --- ARAMA ÇUBUĞU --- */}
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-slate-400" size={20} />
             </div>
             <input 
               type="text"
               placeholder="Favorilerde ara (Başlık, içerik veya yazar)..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-xl shadow-indigo-900/10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/20 font-medium transition-all"
             />
             {searchTerm && (
                <div className="absolute right-4 top-4 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                   {filteredFavorites.length} Sonuç
                </div>
             )}
          </div>

        </div>
      </div>

      {/* --- LİSTE ALANI --- */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="space-y-4">
          
          {filteredFavorites.length > 0 ? (
            filteredFavorites.map((fav) => {
              const question = fav.questions;
              const author = Array.isArray(question.profiles) ? question.profiles[0] : question.profiles;

              return (
                <Link key={fav.id} href={`/questions/${question.id}?from=favorites`} className="block group">
                  <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-orange-400 hover:shadow-orange-100/50 transition-all duration-300 relative">
                     
                     <div className="flex justify-between items-start mb-4">
                        {/* Yazar Bilgisi */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative">
                              {author?.avatar_url ? (
                                <img src={author.avatar_url} className="w-full h-full object-cover"/>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-indigo-900 font-bold bg-indigo-50">
                                  <User size={18} />
                                </div>
                              )}
                            </div>
                            <div>
                               <span className="block text-sm font-bold text-slate-900">{author?.full_name || "Gizli Üye"}</span>
                               <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                 <Calendar size={12} /> {moment(question.created_at).format("D MMMM YYYY")}
                               </span>
                            </div>
                        </div>
                        
                        {/* Favori Butonu */}
                        <div onClick={(e) => e.preventDefault()}> 
                           <FavoriteButton itemId={question.id} initialIsFavorited={true} type="question" />
                        </div>
                     </div>

                     {/* İçerik */}
                     <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {question.title}
                     </h3>
                     <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-4">
                        {question.content}
                     </p>
                     
                     {/* Alt Bar */}
                     <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg">
                           Soru
                        </span>
                        <div className="flex items-center gap-1 text-sm font-bold text-orange-500 group-hover:translate-x-1 transition-transform">
                           Detaya Git <ArrowRight size={16} />
                        </div>
                     </div>

                  </div>
                </Link>
              )
            })
          ) : (
            /* BOŞ DURUM */
            <div className="flex flex-col items-center justify-center py-20 text-center mt-10">
               <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-slate-100">
                  {searchTerm ? (
                    <Search size={48} className="text-orange-300" />
                  ) : (
                    <FolderOpen size={48} className="text-indigo-200" />
                  )}
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">
                 {searchTerm ? "Sonuç Bulunamadı" : "Dosya Boş"}
               </h3>
               <p className="text-slate-500 text-sm max-w-[250px] mx-auto">
                  {searchTerm 
                    ? `"${searchTerm}" aramasıyla eşleşen favori bulunamadı.` 
                    : "Gündemdeki tartışmalarda gördüğün ilginç konuları yıldızlayarak buraya ekle."}
               </p>
               {!searchTerm && (
                 <Link href="/dashboard" className="mt-8 bg-slate-900 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-orange-500 transition-colors shadow-lg hover:shadow-orange-500/30 flex items-center gap-2">
                    Gündeme Dön <ArrowRight size={16} />
                 </Link>
               )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}