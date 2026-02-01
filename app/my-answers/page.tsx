import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronLeft, HelpCircle, MessageCircle, PenTool } from "lucide-react";

export default async function MyAnswersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cevapları Çek 
  const { data: answers } = await supabase
    .from("answers")
    // Sorunun başlığını da almak için ilişkisel sorgu yapıyoruz
    .select("*, questions(title, content)") 
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28 pt-6 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/questions" className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
            <ChevronLeft size={22} className="text-gray-700"/>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Verdiğim Cevaplar</h1>
      </div>

      <div className="space-y-4">
        {answers && answers.length > 0 ? (
          answers.map((ans) => (
            <Link key={ans.id} href={`/questions/${ans.question_id}`} className="block group">
              <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden transition-all hover:shadow-lg">
                
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-400 to-blue-600 opacity-80"></div>

                <div className="flex justify-between items-start mb-3 pl-2">
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                        Cevap
                    </span>
                </div>

                <div className="pl-2">
                    {/* Cevap İçeriği */}
                    <p className="text-gray-800 font-medium text-base mb-4 line-clamp-3 leading-relaxed">
                    "{ans.content}"
                    </p>

                    {/* Hangi soruya cevap verilmiş? */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 group-hover:bg-blue-50/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <HelpCircle size={14} className="text-gray-400" /> 
                            <p className="text-xs text-gray-500 font-bold uppercase">Şuna cevap verdin:</p>
                        </div>
                        {/* @ts-ignore */}
                        <p className="text-xs text-gray-700 font-medium line-clamp-1 italic">{ans.questions?.title || ans.questions?.content || "Soru silinmiş"}</p>
                    </div>

                    <div className="flex items-center justify-end text-gray-400 text-xs font-semibold gap-1.5 mt-4">
                    <Calendar size={14} />
                    <span>{new Date(ans.created_at).toLocaleDateString("tr-TR")}</span>
                    </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-20">
             <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <PenTool size={36} className="text-blue-300"/>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz cevap yazmadın</h3>
            <p className="text-gray-500 font-medium mb-6">Bilgini paylaşarak topluluğa katkıda bulun.</p>
            <Link href="/questions" className="inline-block bg-white text-gray-700 border border-gray-200 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">
                Soruları İncele
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}