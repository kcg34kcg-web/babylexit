'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import moment from 'moment';
import Link from 'next/link';
import 'moment/locale/tr';

import {
  ArrowLeft,
  User,
  Calendar,
  Bot,
  CheckCircle2,
  Star,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ShieldAlert,
  Loader2 // Spinner ekledik
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
  status: string; // 'analyzing', 'answered', 'approved'
  created_at: string;
  profiles: Profile;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Geri Dönüş Linki
  const fromWhere = searchParams.get('from');
  const backLink = fromWhere === 'favorites' ? '/favorites' : '/dashboard';
  const backText = fromWhere === 'favorites' ? 'Favorilere Dön' : 'Panele Dön';

  // --- VERİ ÇEKME ---
  const fetchData = async () => {
    try {
      // setIsLoading(true); // Her fetch'te ekranı beyazlatmamak için bunu kapattık

      if (!id) return;

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // 1. Soruyu Çek
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select(`*, profiles(full_name, avatar_url)`)
        .eq('id', id)
        .maybeSingle();

      if (qError) throw qError;
      if (!qData) {
        setQuestion(null);
        return;
      }

      setQuestion(qData as any);

      // 2. Cevapları Çek
      const { data: aData } = await supabase
        .from('answers')
        .select(`
          *,
          profiles(full_name, avatar_url),
          votes(user_id, vote_type)
        `)
        .eq('question_id', id)
        .order('is_ai_generated', { ascending: false }) // AI en üstte
        .order('created_at', { ascending: true });

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
      console.error("Hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- REALTIME DİNLEME (AI CEVABI GELDİ Mİ?) ---
  useEffect(() => {
    if (!id) return;

    fetchData(); // İlk yükleme
    moment.locale('tr');

    // Supabase Kanalı Oluştur
    const channel = supabase
      .channel(`question-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'questions',
          filter: `id=eq.${id}`
        },
        (payload) => {
          // Soru durumu güncellendiyse (analyzing -> answered)
          if (payload.new.status === 'answered') {
            fetchData(); // Sayfayı yenile (Yeni cevabı çek)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'answers',
          filter: `question_id=eq.${id}`
        },
        () => {
          fetchData(); // Yeni cevap geldiyse listeyi yenile
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // --- OYLAMA ---
  const handleVote = async (answerId: string, voteType: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Oy vermek için giriş yapmalısınız!");

    // Optimistic UI Update
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

    fetchData(); // Doğrulama için tekrar çek
  };

  // --- RENDER ---

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
       <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
       <p className="text-slate-500 font-medium">İçerik yükleniyor...</p>
    </div>
  );

  if (!question) return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-10 text-center flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-full shadow-lg mb-6">
        <Bot size={48} className="text-slate-300" />
      </div>
      <p className="mb-4 text-xl font-bold">Aradığınız soru bulunamadı.</p>
      <Link href="/dashboard" className="text-orange-500 font-bold hover:underline">Panele Dön</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto">

        {/* GERİ BUTONU */}
        <Link
          href={backLink}
          className="inline-flex items-center bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 px-4 py-2 rounded-full mb-8 transition-all shadow-sm group font-medium text-sm"
        >
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          {backText}
        </Link>

        {/* SORU KARTI */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-indigo-900/5 border border-indigo-50 mb-10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-indigo-600"></div>

          {/* Durum Rozeti */}
          <div className={`absolute top-5 right-5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border flex items-center gap-2 ${
            question.status === 'analyzing' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse' :
            question.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {question.status === 'analyzing' && <Loader2 size={10} className="animate-spin" />}
            {question.status === 'analyzing' ? 'AI Analiz Ediyor...' :
             question.status === 'open' ? 'Görüşe Açık' : 'Çözüldü'}
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-slate-900 mb-6 leading-tight mt-4">
            {question.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-slate-500 mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-orange-500 font-bold border border-slate-200">
                <User size={14} />
              </div>
              <span className="font-bold text-slate-700">{question.profiles?.full_name || 'Gizli Üye'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-orange-400" />
              <span className="font-medium">{moment(question.created_at).fromNow()}</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
            {question.content}
          </div>
        </div>

        {/* CEVAPLAR BAŞLIK */}
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            Görüşler
            <span className="bg-orange-100 text-orange-700 text-sm py-1 px-3 rounded-full border border-orange-200 font-bold">
              {answers.length}
            </span>
          </h2>
        </div>

        {/* AI ANALİZ SÜRÜYORSA GÖSTERİLECEK SKELETON */}
        {question.status === 'analyzing' && answers.length === 0 && (
           <div className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-3xl mb-6 flex flex-col items-center justify-center text-center animate-pulse">
              <Sparkles className="w-12 h-12 text-indigo-400 mb-4 animate-spin-slow" />
              <h3 className="text-indigo-900 font-bold text-lg">Yapay Zeka Analizi Hazırlanıyor...</h3>
              <p className="text-indigo-600/70 text-sm mt-2 max-w-md">
                 Hukuki asistanımız şu anda sorunuzu inceliyor, emsal durumları tarıyor ve yanıtını hazırlıyor. Bu işlem birkaç saniye sürebilir.
              </p>
           </div>
        )}

        <div className="space-y-6">
          {answers.map((answer) => {
            const isAI = answer.is_ai_generated;

            return (
              <div key={answer.id} className={`rounded-2xl p-6 md:p-8 flex gap-5 transition-all ${
                isAI
                ? 'bg-indigo-50/60 border border-indigo-100 shadow-sm relative overflow-hidden'
                : 'bg-white border border-slate-200 shadow-sm hover:border-orange-200 hover:shadow-md'
              }`}>
                {isAI && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}

                {/* SOL: OYLAMA */}
                <div className="flex flex-col items-center gap-1 text-slate-400 pt-1">
                  <button onClick={() => handleVote(answer.id, 1)} className="hover:bg-slate-100 p-1.5 rounded-full hover:text-emerald-500 transition-all">
                    <ArrowUp size={20} strokeWidth={3} />
                  </button>
                  <span className={`font-black text-lg ${(answer.upvotes - answer.downvotes) > 0 ? 'text-emerald-500' : (answer.upvotes - answer.downvotes) < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {answer.upvotes - answer.downvotes}
                  </span>
                  <button onClick={() => handleVote(answer.id, -1)} className="hover:bg-slate-100 p-1.5 rounded-full hover:text-red-500 transition-all">
                    <ArrowDown size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex-1">
                  {/* CEVAP HEADER */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      {isAI ? (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-indigo-200 shadow-sm">
                          <Sparkles size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold border border-orange-100">
                          {answer.profiles?.full_name?.[0] || 'U'}
                        </div>
                      )}

                      <div>
                        {isAI ? (
                           <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                             <span className="text-indigo-900 font-bold text-lg">Babylexit AI</span>
                             <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md border border-indigo-200 w-fit font-bold tracking-wide">
                               ⚖️ HUKUKİ ANALİZ
                             </span>
                           </div>
                        ) : (
                           <div className="text-slate-900 font-bold text-lg">{answer.profiles?.full_name || 'İsimsiz'}</div>
                        )}
                        <div className="text-xs text-slate-400 font-medium">{moment(answer.created_at).fromNow()}</div>
                      </div>
                    </div>

                    {/* SKORLAMA */}
                    <div className="flex flex-wrap gap-2 justify-end">
                        {answer.is_verified && (
                            <div className="flex items-center text-emerald-700 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                <CheckCircle2 size={14} className="mr-1.5" /> Doğrulanmış Görüş
                            </div>
                        )}
                        {!isAI && answer.ai_score !== null && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border shadow-sm ${
                                answer.ai_score >= 70 ? 'bg-white border-emerald-100 text-emerald-600' :
                                answer.ai_score >= 40 ? 'bg-white border-amber-100 text-amber-600' :
                                'bg-white border-red-100 text-red-600'
                            }`}>
                                <Star size={12} fill="currentColor" />
                                SKOR: %{answer.ai_score}
                            </div>
                        )}
                    </div>
                  </div>

                  {/* CEVAP TEXT */}
                  <div className={`text-base leading-relaxed whitespace-pre-wrap mb-4 font-medium ${isAI ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {answer.content}
                  </div>

                  {/* AI FEEDBACK */}
                  {!isAI && answer.ai_feedback && (
                    <div className="mt-4 text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-3">
                        <Bot size={18} className="text-orange-500 shrink-0" />
                        <div>
                            <span className="font-bold text-orange-600 block mb-1">AI Geri Bildirimi:</span>
                            {answer.ai_feedback}
                        </div>
                    </div>
                  )}

                  {isAI && (
                      <div className='mt-3 text-[10px] text-indigo-400 font-bold uppercase tracking-widest opacity-70'>
                          * Bu içerik yapay zeka tarafından oluşturulmuştur. Hukuki tavsiye yerine geçmez.
                      </div>
                  )}
                </div>
              </div>
            );
          })}

          {answers.length === 0 && question.status !== 'analyzing' && (
             <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot size={32} className="text-slate-400" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">Henüz görüş bildiren olmadı</h3>
                <p className="text-slate-500 text-sm mt-1">Bu konudaki ilk uzman görüşünü sen paylaş!</p>
             </div>
          )}
        </div>

        <div className="mt-12">
            {/* KENDİ SORUSUNA CEVAP ENGELİ */}
            {question && currentUserId === question.user_id ? (
              <div className="bg-orange-50 border border-orange-100 p-8 rounded-3xl text-center shadow-sm">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 shadow-sm border border-orange-100">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-orange-900 font-black text-xl mb-2">Kendi Sorusuna Cevap Verilemez</h3>
                <p className="text-orange-800/80 font-medium text-sm max-w-md mx-auto leading-relaxed">
                  Bu tartışmayı siz başlattınız. Objektif bir ortam sağlamak adına kendi sorunuza cevap ekleyemezsiniz, ancak gelen cevapları oylayabilirsiniz.
                </p>
              </div>
            ) : (
              <AnswerForm questionId={id} />
            )}
        </div>
      </div>
    </div>
  );
}