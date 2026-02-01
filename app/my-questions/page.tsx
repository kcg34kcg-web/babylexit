import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronLeft, Star, HelpCircle } from "lucide-react";

export default async function MyQuestionsPage() {
  const supabase = await createClient();

  // 1. Kullanıcı Kontrolü
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Soruları ve Favori Bilgisini Çek
  const { data: questions } = await supabase
    .from("questions")
    .select(`
      *,
      favorites(id) 
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // İstemci tarafında sıralama (Yıldızlılar en üstte) için client component kullanmak daha iyidir 
  // ama basitlik adına burada düz listeliyoruz.

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28 pt-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/questions" className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
            <ChevronLeft size={22} className="text-gray-700"/>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Sorduğum Sorular</h1>
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {questions && questions.length > 0 ? (
          questions.map((q) => {
             // @ts-ignore
             const isFavorited = q.favorites && q.favorites.length > 0;
             
             return (
            <div key={q.id} className="group bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                
                {/* Sol Dekoratif Çizgi */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-orange-600 opacity-80"></div>

                <div className="flex justify-between items-start mb-3 pl-2">
                    <span className="bg-orange-50 text-orange-600 text-[10px] font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                        Soru
                    </span>
                    {/* Favori butonu (şimdilik sadece görsel, interaktif olması için Client Component gerekir) */}
                    <button className="p-1">
                      <Star 
                        size={22} 
                        className={isFavorited ? "fill-gold-star text-gold-star" : "text-gray-300 hover:text-gold-star"} 
                      />
                    </button>
                </div>

                <Link href={`/questions/${q.id}`} className="block pl-2">
                    <h3 className="font-bold text-gray-800 text-lg leading-snug mb-3 line-clamp-2 group-hover:text-lexwoow-start transition-colors">
                    {q.title || q.content} 
                    </h3>
                    
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4 font-medium">
                        {q.content}
                    </p>

                    <div className="flex items-center text-gray-400 text-xs font-semibold gap-1.5">
                    <Calendar size={14} />
                    <span>{new Date(q.created_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </Link>
            </div>
          )})
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <HelpCircle size={36} className="text-orange-300"/>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz soru sormadın</h3>
            <p className="text-gray-500 font-medium mb-6">Hukuk dünyasındaki merak ettiklerini hemen sor.</p>
            <Link href="/ask" className="inline-block bg-gradient-to-r from-lexwoow-start to-lexwoow-end text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all">
                İlk Sorunu Sor
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}