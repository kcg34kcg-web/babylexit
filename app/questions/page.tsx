'use client';

import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import moment from 'moment';
import Link from 'next/link';
import 'moment/locale/tr';
import { ArrowLeft, Loader2, User, Calendar, Bot, CheckCircle2, Star, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import AnswerForm from '@/components/answer-form';
import { voteAction } from "@/app/questions/[id]/actions";

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
  is_ai_generated: boolean; // <--- EKLENDİ
  ai_score: number | null;
  ai_critique: string | null;
  upvotes: number;
  downvotes: number;
  profiles: Profile;
}

interface AIResponse {
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
  ai_response: AIResponse | null;
  profiles: Profile;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // --- OPTIMISTIC OYLAMA FONKSİYONU ---
  const handleVote = async (answerId: string, voteType: 1 | -1) => {
    const originalAnswers = [...answers];

    // Kullanıcıya anında tepki ver (Optimistic Update)
    setAnswers(prevAnswers => 
      prevAnswers.map(ans => {
        if (ans.id === answerId) {
          return {
            ...ans,
            upvotes: voteType === 1 ? (ans.upvotes || 0) + 1 : (ans.upvotes || 0),
            downvotes: voteType === -1 ? (ans.downvotes || 0) + 1 : (ans.downvotes || 0)
          };
        }
        return ans;
      })
    );

    const result = await voteAction(answerId, voteType);

    if (result?.error) {
      setAnswers(originalAnswers);
      alert(result.error);
    } else {
      // Sessizce güncelleme yapmaya gerek yok, optimistic yeterli olur genelde
      // ama garanti olsun derseniz:
      // fetchAnswers(); 
    }
  };

  const fetchAnswers = async () => {
    const { data } = await supabase
      .from('answers')
      .select(`
        id, content, created_at, is_verified, is_ai_generated, ai_score, ai_critique, upvotes, downvotes,
        profiles (full_name, avatar_url)
      `)
      .eq('question_id', id)
      // ÖNCE AI CEVABI, SONRA TARİH (YENİDEN ESKİYE)
      .order('is_ai_generated', { ascending: false }) 
      .order('created_at', { ascending: true }); // veya false, tercihinize göre

    if (data) setAnswers(data as any);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      
      const { data: questionData } = await supabase
        .from('questions')
        .select(`*, profiles (full_name, avatar_url)`)
        .eq('id', id)
        .single();

      if (questionData) {
        setQuestion(questionData as any);
        
        // Eski AI sistemi (soru tablosundaki JSON alanı) hala duruyor
        if (!questionData.ai_response) {
          // Gerekirse burası çalışmaya devam edebilir
          fetch('/api/ai/analyze', {
            method: 'POST',
            body: JSON.stringify({ 
                questionId: questionData.id, 
                title: questionData.title, 
                content: questionData.content 
            }),
          }).catch(err => console.error("Auto-analyze error:", err));
        }
      }

      await fetchAnswers();
      setIsLoading(false);
    };

    fetchData();
    moment.locale('tr');
  }, [id]);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-500 w-12 h-12" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-amber-500 mb-6 transition-all group">
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1" /> Geri Dön
        </Link>

        {/* SORU KARTI */}
        {question && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
            <h1 className="text-3xl font-bold mb-4">{question.title}</h1>
            <p className="text-slate-400 leading-relaxed mb-6 whitespace-pre-wrap">{question.content}</p>
            
            {/* ESKİ AI ANALİZ KUTUSU (İsterseniz kaldırabilirsiniz, yeni sistem aşağıda) */}
            {question.ai_response && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mt-4">
                <div className="flex items-center gap-2 mb-3 text-amber-500">
                  <Bot size={20} /> <span className="font-bold uppercase tracking-tight text-sm">Hızlı Özet</span>
                </div>
                <p className="text-sm italic mb-4 leading-relaxed text-slate-400">{question.ai_response.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* CEVAPLAR LİSTESİ */}
        <div className="space-y-6 mb-10">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-4">Topluluk Görüşleri ({answers.length})</h2>
          
          {answers.map((answer) => {
            // AI CEVABI MI?
            const isAI = answer.is_ai_generated;

            return (
              <div 
                key={answer.id} 
                className={`rounded-xl p-6 flex gap-6 transition-all ${
                  isAI 
                    ? 'bg-blue-950/20 border border-blue-500/30 shadow-lg shadow-blue-900/10' // AI Stil
                    : 'bg-slate-900/50 border border-slate-800' // Normal Stil
                }`}
              >
                
                {/* OYLAMA SİSTEMİ */}
                <div className="flex flex-col items-center gap-2 pr-2 border-r border-slate-800/50 min-w-[3rem]">
                  <button onClick={() => handleVote(answer.id, 1)} className={`transition-colors p-1 ${isAI ? 'hover:text-blue-400' : 'hover:text-green-500'}`}>
                    <ArrowUp size={24} />
                  </button>
                  <span className={`font-bold text-lg ${isAI ? 'text-blue-200' : 'text-slate-300'}`}>
                    {(answer.upvotes || 0) - (answer.downvotes || 0)}
                  </span>
                  <button onClick={() => handleVote(answer.id, -1)} className="hover:text-red-500 transition-colors p-1">
                    <ArrowDown size={24} />
                  </button>
                </div>

                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      
                      {/* AVATAR */}
                      {isAI ? (
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                          <Sparkles size={18} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold border border-amber-500/20">
                          {answer.profiles?.full_name?.[0] || 'U'}
                        </div>
                      )}

                      <div>
                        {isAI ? (
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-blue-300">Babylexit AI</span>
                             <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-medium">
                               TOPLULUK NOTU
                             </span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold block text-slate-200">{answer.profiles?.full_name || 'İsimsiz Üye'}</span>
                        )}
                        <span className="text-[10px] text-slate-500">{moment(answer.created_at).fromNow()}</span>
                      </div>
                    </div>

                    {/* GÜVEN SKORU (Sadece İnsan Cevaplarında) */}
                    {!isAI && answer.ai_score && (
                      <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded border ${
                        answer.ai_score >= 70 ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        <Star size={10} fill="currentColor" /> %{answer.ai_score} GÜVEN
                      </div>
                    )}
                  </div>

                  {/* İÇERİK */}
                  <div className={`text-sm leading-relaxed mb-4 whitespace-pre-wrap ${isAI ? 'text-blue-100/90 font-medium' : 'text-slate-300'}`}>
                    {answer.content}
                  </div>

                  {/* AI FEEDBACK (Sadece İnsan Cevaplarında) */}
                  {!isAI && answer.ai_critique && (
                    <div className="bg-slate-950/50 p-3 rounded-lg border-l-2 border-slate-700 text-[11px] text-slate-500 italic">
                      <span className="text-amber-500/50 not-italic font-bold mr-1">AI Geri Bildirim:</span>
                      {answer.ai_critique}
                    </div>
                  )}
                  
                   {/* AI YASAL UYARI (Sadece AI Cevaplarında) */}
                   {isAI && (
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-blue-400/60">
                      <CheckCircle2 size={12} />
                      <span>Bu yanıt Türk Hukuku kaynakları taranarak oluşturulmuştur. Kesin hukuki tavsiye yerine geçmez.</span>
                    </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>

        <AnswerForm questionId={id} />
      </div>
    </div>
  );
}