'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/tr';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  MessageSquare, 
  Star, 
  Loader2, 
  Calendar,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Layout,
  CornerDownRight,
  User,
  Bot // AI ikonunu ekledim (gerekirse diye)
} from 'lucide-react';

export default function MyContentPage() {
  const [activeTab, setActiveTab] = useState<'questions' | 'answers' | 'starred'>('questions');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. SADECE Senin Soruların
      const { data: userQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (userQuestions) setQuestions(userQuestions);

      // 3. SADECE Senin (İnsan) Cevapların - KRİTİK DÜZELTME BURADA
      const { data: userAnswers } = await supabase
        .from('answers') 
        .select(`
            *, 
            question:questions (
                id,
                title,
                user_id,
                profiles:profiles (full_name) 
            )
        `) 
        .eq('user_id', user.id) // Cevap sahibi sensin
        .eq('is_ai', false)     // <--- İŞTE BU SATIR: AI OLMAYANLARI GETİR
        // Eğer veritabanında 'is_ai' kolonu yoksa bu satır hata verir veya çalışmaz.
        // Alternatif olarak 'role' kolonu varsa: .neq('role', 'assistant') kullanabilirsin.
        .order('created_at', { ascending: false });

      if (userAnswers) {
        // İkinci bir güvenlik önlemi: JavaScript ile filtreleme
        // Veritabanı filtresi çalışmazsa diye manuel temizlik yapıyoruz.
        const onlyHumanAnswers = userAnswers.filter(ans => ans.is_ai !== true);
        setAnswers(onlyHumanAnswers);
      }

      setLoading(false);
    };

    fetchData();
    moment.locale('tr');
  }, [supabase, router]);

  // Yıldızlı içerik
  const starredItems = [...questions, ...answers].filter(item => item.is_starred); 

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-900 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* GERİ DÖN */}
        <div>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:border-amber-500 group-hover:text-amber-600 transition-all">
               <ArrowLeft size={16} />
            </div>
            <span className="font-bold text-sm">Dashboard'a Dön</span>
          </Link>
        </div>

        {/* BAŞLIK */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
                    <Layout size={24} />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    İçerik Yönetimi
                </h1>
             </div>
             <p className="text-slate-600 font-medium pl-1">
                Sorularını ve <span className="underline decoration-amber-400">bizzat yazdığın</span> cevapları yönet.
             </p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
             <div className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center min-w-[100px]">
                <span className="block text-2xl font-bold text-slate-900">{questions.length}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Soru</span>
             </div>
             <div className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center min-w-[100px]">
                <span className="block text-2xl font-bold text-slate-900">{answers.length}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cevap</span>
             </div>
          </div>
        </div>

        {/* SEKMELER */}
        <div className="flex p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'questions' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText size={18} className={activeTab === 'questions' ? 'text-amber-400' : ''} />
            Sorduğum Sorular
          </button>
          
          <button
            onClick={() => setActiveTab('answers')}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'answers' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={18} className={activeTab === 'answers' ? 'text-amber-400' : ''} />
            Verdiğim Cevaplar
          </button>
          
          <button
            onClick={() => setActiveTab('starred')}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'starred' 
                ? 'bg-slate-900 text-amber-400 shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-amber-500'
            }`}
          >
            <Star size={18} className={activeTab === 'starred' ? 'fill-amber-400' : ''} />
            Altın Arşiv
          </button>
        </div>

        {/* İÇERİK */}
        <div className="space-y-4">
          
          {/* SORDUĞUM SORULAR */}
          {activeTab === 'questions' && (
            questions.length > 0 ? (
              <div className="grid gap-4">
                  {questions.map((q) => (
                    <Link key={q.id} href={`/questions/${q.id}`} className="block group">
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-amber-400 hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-900 group-hover:bg-amber-500 transition-colors"></div>
                        <div className="pl-4">
                            <div className="flex justify-between items-start mb-3">
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 uppercase tracking-wider flex items-center gap-1">
                                    <FileText size={12} className="text-amber-600"/> SEN SORDUN
                                </span>
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                    <Calendar size={12}/> {moment(q.created_at).format('DD MMM YYYY')}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors line-clamp-1">
                                {q.title}
                            </h3>
                            <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">{q.content}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                <FileText size={32} className="mx-auto text-slate-400 mb-4" />
                <h3 className="text-slate-900 font-bold">Hiç soru sormamışsın</h3>
              </div>
            )
          )}

          {/* VERDİĞİM CEVAPLAR (AI HARİÇ) */}
          {activeTab === 'answers' && (
            answers.length > 0 ? (
              <div className="grid gap-4">
                  {answers.map((ans) => (
                    <Link key={ans.id} href={`/questions/${ans.question_id}`} className="block group">
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-amber-400 hover:shadow-md transition-all relative">
                        
                        {/* Hangi Soru? */}
                        <div className="mb-4 pb-4 border-b border-slate-100">
                           <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  BU SORUYA YANIT VERDİN:
                                </span>
                                <span className="ml-auto text-xs text-slate-400 font-medium">{moment(ans.created_at).fromNow()}</span>
                           </div>
                           <div className="flex items-start gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                <FileText size={16} className="text-slate-400 mt-0.5 shrink-0"/>
                                <div>
                                  <h4 className="text-slate-800 font-bold text-sm line-clamp-1">
                                      {ans.question?.title || 'Soru bulunamadı'}
                                  </h4>
                                </div>
                           </div>
                        </div>
                        
                        {/* Benim Cevabım */}
                        <div className="flex gap-3 pl-2">
                           <div className="pt-1">
                                <CornerDownRight size={20} className="text-amber-500" />
                           </div>
                           <div className="flex-1 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                <span className="text-[10px] font-bold text-amber-600 mb-1 block">SENİN CEVABIN</span>
                                <p className="text-slate-900 text-sm font-medium line-clamp-3 leading-relaxed">
                                    "{ans.content}"
                                </p>
                           </div>
                        </div>

                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                 <MessageSquare size={32} className="mx-auto text-slate-400 mb-4" />
                <h3 className="text-slate-900 font-bold text-lg">Henüz cevap yazmamışsın</h3>
                <p className="text-slate-500 text-sm mt-1 mb-4">
                    Listede yapay zeka cevapları gizlenmiştir.
                </p>
              </div>
            )
          )}

          {/* ALTIN ARŞİV */}
          {activeTab === 'starred' && (
             <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
               <Star size={40} className="mx-auto text-amber-500 mb-4" />
               <h3 className="text-slate-900 font-bold text-xl mb-2">Altın Arşiv Boş</h3>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}