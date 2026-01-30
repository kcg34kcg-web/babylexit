'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import moment from 'moment';
import Link from 'next/link';
import 'moment/locale/tr';
import { ArrowLeft, Loader2, User, Calendar, Bot, CheckCircle2, Star, ArrowUp, ArrowDown } from 'lucide-react'; // ArrowUp/Down eklendi
import AnswerForm from '@/components/answer-form';

// Veri Tipleri
interface Profile {
  full_name: string;
  avatar_url: string;
}

interface Answer {
  id: string;
  content: string;
  created_at: string;
  is_verified: boolean;
  ai_score: number | null;
  ai_feedback: string | null;
  upvotes: number; // YENİ
  downvotes: number; // YENİ
  profiles: Profile;
}

interface AIResponse { // JSONB Yapısı için yeni interface
  summary: string;
  laws: string[];
  disclaimer: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  user_id: string;
  status: string;
  created_at: string;
  ai_response: AIResponse | null; // Tip güncellendi
  profiles: Profile;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // --- YENİ: OYLAMA FONKSİYONU (RPC BAĞLANTISI) ---
  const handleVote = async (answerId: string, voteType: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Oy vermek için giriş yapmalısınız!");
      return;
    }

    const { error } = await supabase.rpc('vote_answer', {
      p_answer_id: answerId,
      p_user_id: user.id,
      p_vote_type: voteType
    });

    if (error) {
      console.error("Oylama hatası:", error);
    } else {
      // Veriyi sessizce güncellemek için fetchData'yı tekrar çağırıyoruz
      fetchAnswers(); 
    }
  };

  const fetchAnswers = async () => {
    const { data: answersData } = await supabase
      .from('answers')
      .select(`
        id, content, created_at, is_verified, ai_score, ai_feedback, upvotes, downvotes,
        profiles (full_name, avatar_url)
      `)
      .eq('question_id', id)
      .order('created_at', { ascending: true });

    if (answersData) setAnswers(answersData as any);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      // 1. SORUYU ÇEK
      const { data: questionData, error: qError } = await supabase
        .from('questions')
        .select(`
          id, title, content, user_id, status, created_at, ai_response,
          profiles (full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (qError) {
        setError('Soru yüklenemedi.');
      } else {
        setQuestion(questionData as any);
        
        if (questionData && !questionData.ai_response) {
            fetch('/api/ai/analyze', {
                method: 'POST',
                body: JSON.stringify({ 
                    questionId: questionData.id, 
                    title: questionData.title, 
                    content: questionData.content 
                }),
            }).then(res => res.json()).then(data => {
                if (data.ai_response) {
                    setQuestion(prev => prev ? { ...prev, ai_response: data.ai_response } : null);
                }
            }).catch(err => console.error("AI tetikleme hatası:", err));
        }
      }

      // 2. CEVAPLARI ÇEK
      await fetchAnswers();

      setIsLoading(false);
    };

    fetchData();
    moment.locale('tr');
  }, [id, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500 w-12 h-12" />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-center">
        <h2 className="text-red-500 text-xl font-bold mb-4">{error || 'Soru bulunamadı.'}</h2>
        <Link href="/" className="text-amber-500 hover:underline">Anasayfaya Dön</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        <Link 
            href="/" 
            className="inline-flex items-center text-slate-400 hover:text-amber-500 mb-6 transition-colors duration-200 group"
        >
            <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
            Listeye Geri Dön
        </Link>

        {/* SORU KARTI */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-2xl mb-8 relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider ${
                question.status === 'open' ? 'bg-green-500/20 text-green-500' : 'bg-slate-700 text-slate-400'
            }`}>
                {question.status === 'open' ? 'Görüşe Açık' : 'Çözüldü'}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                {question.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <User size={16} className="text-amber-500" />
                    <span className="text-slate-200 font-medium">{question.profiles?.full_name || 'Gizli Üye'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" />
                    <span>{moment(question.created_at).fromNow()}</span>
                </div>
            </div>

            <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                {question.content}
            </div>
        </div>

        {/* --- DİNAMİK AI BÖLÜMÜ (JSONB OKUMA GÜNCELLENDİ) --- */}
        <div className={`bg-slate-900/50 border ${question.ai_response ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-amber-500/20'} rounded-xl p-6 mb-10 transition-all duration-500`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full flex-shrink-0 ${question.ai_response ? 'bg-amber-500' : 'bg-amber-500/10'}`}>
                    <Bot size={24} className={question.ai_response ? 'text-slate-950' : 'text-amber-500 animate-pulse'} />
                </div>
                <div>
                    <h3 className="text-amber-500 font-bold text-lg">Babylexit AI Analizi</h3>
                    {question.ai_response && <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase">Hukuki Görüş</span>}
                </div>
            </div>
            
            {question.ai_response ? (
                <div className="space-y-4">
                  <p className="text-slate-200 text-sm leading-relaxed border-l-2 border-amber-500/30 pl-4">
                      {question.ai_response.summary}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {question.ai_response.laws?.map((law, idx) => (
                      <span key={idx} className="bg-slate-800 text-amber-500 text-[10px] px-2 py-1 rounded border border-slate-700">
                        {law}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 italic uppercase">⚠️ {question.ai_response.disclaimer}</p>
                </div>
            ) : (
                <p className="text-slate-500 text-sm italic">Yapay zeka bu hukuki durumu tarıyor...</p>
            )}
        </div>

        {/* TOPLULUK CEVAPLARI */}
        <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                Topluluk Cevapları
                <span className="bg-slate-800 text-sm py-1 px-3 rounded-full text-slate-400">
                    {answers.length}
                </span>
            </h2>

            <div className="space-y-6">
                {answers.length > 0 ? (
                    answers.map((answer) => (
                        <div key={answer.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 flex gap-6 hover:border-slate-600 transition-all">
                            {/* --- YENİ: OYLAMA KONTROLLERİ --- */}
                            <div className="flex flex-col items-center gap-1">
                              <button onClick={() => handleVote(answer.id, 1)} className="text-slate-500 hover:text-green-500 transition-colors">
                                <ArrowUp size={20} />
                              </button>
                              <span className="text-sm font-bold text-slate-300">{(answer.upvotes || 0) - (answer.downvotes || 0)}</span>
                              <button onClick={() => handleVote(answer.id, -1)} className="text-slate-500 hover:text-red-500 transition-colors">
                                <ArrowDown size={20} />
                              </button>
                            </div>

                            <div className="flex-grow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-amber-500 font-bold border border-slate-600">
                                            {(answer.profiles?.full_name || 'U')[0]}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-sm">{answer.profiles?.full_name || 'İsimsiz'}</div>
                                            <div className="text-xs text-slate-500">{moment(answer.created_at).fromNow()}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {answer.is_verified && (
                                            <div className="flex items-center text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">
                                                <CheckCircle2 size={14} className="mr-1" /> Doğrulanmış
                                            </div>
                                        )}
                                        {answer.ai_score !== null && (
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
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap mb-4">{answer.content}</p>
                                {answer.ai_feedback && (
                                    <div className="text-[11px] text-slate-500 bg-slate-900/30 p-2 rounded border-l-2 border-slate-700 italic">
                                        AI Notu: {answer.ai_feedback}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                        <p className="text-slate-500">Henüz cevap yazılmamış.</p>
                    </div>
                )}
            </div>
        </div>

        <AnswerForm questionId={id} />

      </div>
    </div>
  );
}