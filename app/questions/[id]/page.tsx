'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import moment from 'moment';
import Link from 'next/link';
import 'moment/locale/tr';
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Calendar, 
  Bot, 
  CheckCircle2, 
  Star, 
  ArrowUp, 
  ArrowDown, 
  Sparkles 
} from 'lucide-react';
import AnswerForm from '@/components/answer-form';

// --- TİP TANIMLAMALARI ---
interface Profile {
  full_name: string;
  avatar_url: string;
}

interface Answer {
  id: string;
  content: string;
  created_at: string;
  is_verified: boolean;
  is_ai_generated: boolean;
  ai_score: number | null;
  ai_feedback: string | null;
  upvotes: number;
  downvotes: number;
  profiles: Profile;
  votes?: { user_id: string, vote_type: number }[];
}

interface Question {
  id: string;
  title: string;
  content: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: Profile;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  const fetchData = async () => {
    console.log("🚀 FetchData Başlatıldı. ID:", id);
    
    // URL Kontrolü (GÜVENLİK İÇİN SADECE KONSOLA YAZDIRIN)
    console.log("🌍 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Tanımlı" : "TANIMSIZ!");

    try {
      setIsLoading(true);

      if (!id) {
        console.warn("⚠️ ID parametresi yok, işlem iptal.");
        return; // finally çalışacak
      }
      
      console.log("⏳ Soru çekiliyor...");
      // 1. Soruyu Çek
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select(`*, profiles(full_name, avatar_url)`)
        .eq('id', id)
        .maybeSingle();

      if (qError) {
        console.error("❌ Soru çekme hatası:", qError);
        throw qError;
      }
      
      console.log("✅ Soru yanıtı geldi:", qData ? "Veri Var" : "Veri Yok");

      if (!qData) {
        setQuestion(null);
        return; 
      }
      
      setQuestion(qData as any);

      console.log("⏳ Cevaplar çekiliyor...");
      // 2. Cevapları Çek
      const { data: aData, error: aError } = await supabase
        .from('answers')
        .select(`
          *,
          profiles(full_name, avatar_url),
          votes(user_id, vote_type)
        `)
        .eq('question_id', id)
        .order('is_ai_generated', { ascending: false }) 
        .order('created_at', { ascending: true });

      if (aError) {
        console.error("❌ Cevap hatası:", aError);
      } else {
        console.log("✅ Cevaplar geldi. Sayı:", aData?.length);
      }
      
      if (aData) {
        const processedAnswers = aData.map((ans: any) => {
          const votesArray = Array.isArray(ans.votes) ? ans.votes : [];
          const up = votesArray.filter((v: any) => v.vote_type === 1).length;
          const down = votesArray.filter((v: any) => v.vote_type === -1).length;
          return { ...ans, upvotes: up, downvotes: down };
        });
        setAnswers(processedAnswers);
      }
      
    } catch (error) {
      console.error("💥 Beklenmeyen HATA:", error);
    } finally {
      console.log("🏁 Finally bloğu çalıştı: Loading false yapılıyor.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if(id) {
      fetchData();
    } else {
      console.log("⚠️ useEffect çalıştı ama ID henüz yok.");
      setIsLoading(false);
    }
    moment.locale('tr');
  }, [id]);

  // --- OYLAMA İŞLEMİ ---
  const handleVote = async (answerId: string, voteType: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Oy vermek için giriş yapmalısınız!");

    setAnswers(prev => prev.map(a => {
      if (a.id === answerId) {
        return { 
            ...a, 
            upvotes: a.upvotes + (voteType === 1 ? 1 : 0), 
            downvotes: a.downvotes + (voteType === -1 ? 1 : 0) 
        };
      }
      return a;
    }));

    await supabase.rpc('vote_answer', {
      p_answer_id: answerId,
      p_user_id: user.id,
      p_vote_type: voteType
    });
    
    fetchData();
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex justify-center items-center flex-col gap-4">
      <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      <p className="text-slate-400 text-sm">Veriler yükleniyor...</p>
      <button onClick={() => window.location.reload()} className="text-xs text-blue-400 hover:underline">Sayfa takıldıysa yenile</button>
  </div>;
  
  if (!question) return <div className="min-h-screen bg-slate-950 text-white p-10 text-center flex flex-col items-center justify-center">
    <p className="mb-4 text-xl">Soru bulunamadı.</p>
    <Link href="/" className="text-amber-500 hover:underline">Anasayfaya Dön</Link>
  </div>;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-amber-500 mb-6 transition-colors group">
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Listeye Dön
        </Link>

        {/* --- SORU KARTI --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl mb-8 relative overflow-hidden">
             <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider ${
                question.status === 'open' ? 'bg-green-500/20 text-green-500' : 'bg-slate-700 text-slate-400'
            }`}>
                {question.status === 'open' ? 'Görüşe Açık' : 'Çözüldü'}
            </div>

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">{question.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-slate-400 mb-6 border-b border-slate-800 pb-4">
             <div className="flex items-center gap-2">
                <User size={14} className="text-amber-500" /> 
                <span className="text-slate-200">{question.profiles?.full_name || 'Gizli Üye'}</span>
             </div>
             <div className="flex items-center gap-2">
                <Calendar size={14} className="text-amber-500" /> 
                <span>{moment(question.created_at).fromNow()}</span>
             </div>
          </div>
          
          <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap text-lg">
            {question.content}
          </div>
        </div>

        {/* --- CEVAPLAR LİSTESİ --- */}
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            Yanıtlar 
            <span className="bg-slate-800 text-slate-400 text-sm py-0.5 px-2 rounded-full">{answers.length}</span>
        </h2>
        
        <div className="space-y-6">
          {answers.map((answer) => {
            const isAI = answer.is_ai_generated;
            
            return (
              <div key={answer.id} className={`rounded-xl p-6 flex gap-4 transition-all ${
                isAI 
                ? 'bg-blue-950/20 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden' 
                : 'bg-slate-800/40 border border-slate-700 hover:border-slate-600'
              }`}>
                {/* AI Arka Plan Efekti */}
                {isAI && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}

                {/* OYLAMA BUTONLARI */}
                <div className="flex flex-col items-center gap-1 text-slate-500 pt-2">
                  <button onClick={() => handleVote(answer.id, 1)} className="hover:text-green-500 transition-colors p-1">
                    <ArrowUp size={24} />
                  </button>
                  <span className={`font-bold text-lg ${
                    (answer.upvotes - answer.downvotes) > 0 ? 'text-green-500' : 
                    (answer.upvotes - answer.downvotes) < 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {answer.upvotes - answer.downvotes}
                  </span>
                  <button onClick={() => handleVote(answer.id, -1)} className="hover:text-red-500 transition-colors p-1">
                    <ArrowDown size={24} />
                  </button>
                </div>

                <div className="flex-1">
                  {/* CEVAP BAŞLIĞI */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {isAI ? (
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                          <Sparkles size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-amber-500 font-bold border border-slate-600">
                          {answer.profiles?.full_name?.[0] || 'U'}
                        </div>
                      )}
                      
                      <div>
                        {isAI ? (
                           <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                             <span className="text-blue-300 font-bold text-lg">Babylexit AI</span>
                             <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-500/30 w-fit font-bold tracking-wide">
                               ⚖️ HUKUKİ GÖRÜŞ
                             </span>
                           </div>
                        ) : (
                           <div className="text-white font-bold">{answer.profiles?.full_name || 'İsimsiz'}</div>
                        )}
                        <div className="text-xs text-slate-500">{moment(answer.created_at).fromNow()}</div>
                      </div>
                    </div>

                    {/* SAĞ ÜST: SKOR VE DOĞRULAMA */}
                    <div className="flex flex-col items-end gap-2">
                        {answer.is_verified && (
                            <div className="flex items-center text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                                <CheckCircle2 size={12} className="mr-1" /> Doğrulanmış
                            </div>
                        )}
                        
                        {!isAI && answer.ai_score !== null && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black border ${
                                answer.ai_score >= 70 ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                                answer.ai_score >= 40 ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                                'bg-red-500/10 border-red-500/30 text-red-500'
                            }`}>
                                <Star size={10} fill="currentColor" />
                                SKOR: %{answer.ai_score}
                            </div>
                        )}
                    </div>
                  </div>

                  {/* CEVAP İÇERİĞİ */}
                  <div className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap mb-3 ${isAI ? 'text-blue-100' : 'text-slate-300'}`}>
                    {answer.content}
                  </div>

                  {/* AI GERİ BİLDİRİMİ */}
                  {!isAI && answer.ai_feedback && (
                    <div className="mt-3 text-[11px] text-slate-400 bg-slate-900/50 p-3 rounded border-l-2 border-amber-500/50 italic flex gap-2">
                        <Bot size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-amber-500 not-italic">AI Analizi: </span>
                            {answer.ai_feedback}
                        </div>
                    </div>
                  )}
                  
                  {isAI && (
                      <div className='mt-2 text-[10px] text-blue-400/60 uppercase tracking-widest font-bold'>
                          Bu içerik yapay zeka tarafından oluşturulmuştur ve hukuki tavsiye niteliği taşımaz.
                      </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {answers.length === 0 && (
             <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                <Bot size={40} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500">Henüz cevap yok. İlk cevabı sen yaz!</p>
             </div>
          )}
        </div>

        <div className="mt-10">
            <AnswerForm questionId={id} />
        </div>
      </div>
    </div>
  );
}