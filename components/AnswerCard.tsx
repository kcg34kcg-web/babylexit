'use client';

import { useOptimistic, startTransition } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { 
  ChevronUp, 
  ChevronDown, 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle,
  Award,
  User,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface AnswerCardProps {
  answer: {
    id: string;
    content: string;
    is_ai_generated: boolean;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
        username?: string;
        avatar_url?: string;
        ai_endorsements?: number;
    };
    ai_score?: number;
  };
  currentUserVote?: number;
  initialNetScore: number;
  currentUserId?: string;
}

export function AnswerCard({ answer, currentUserVote, initialNetScore, currentUserId }: AnswerCardProps) {
  const supabase = createClient();

  // --- OYLAMA MANTIĞI ---
  const [optimisticVote, addOptimisticVote] = useOptimistic(
    { vote: currentUserVote || 0, score: initialNetScore },
    (state, newVote: number) => {
      const finalVote = state.vote === newVote ? 0 : newVote;
      const diff = finalVote - state.vote;
      return {
        vote: finalVote,
        score: state.score + diff,
      };
    }
  );

  const handleVote = async (voteType: number) => {
    if (!currentUserId) return; 

    startTransition(() => {
      addOptimisticVote(voteType);
    });

    try {
      const finalVote = optimisticVote.vote === voteType ? 0 : voteType;
      if (finalVote === 0) {
        await supabase.from('votes').delete().match({ user_id: currentUserId, answer_id: answer.id });
      } else {
        await supabase.from('votes').upsert(
            { user_id: currentUserId, answer_id: answer.id, vote_type: finalVote },
            { onConflict: 'user_id, answer_id' }
          );
      }
    } catch (error) {
      console.error("Voting failed", error);
    }
  };

  const isAI = answer.is_ai_generated;
  const authorName = answer.profiles?.full_name || "İsimsiz Kullanıcı";
  const authorUsername = answer.profiles?.username;
  const authorAvatar = answer.profiles?.avatar_url;
  const aiEndorsements = answer.profiles?.ai_endorsements || 0;

  return (
    <div className={cn(
      "relative rounded-2xl border p-5 sm:p-6 transition-all duration-300",
      isAI 
        ? "bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100 shadow-sm" // AI Kartı: Hafif İndigo
        : "bg-white border-slate-200 hover:shadow-md shadow-sm" // Kullanıcı Kartı: Temiz Beyaz
    )}>
      
      <div className="flex gap-4 md:gap-6">
        
        {/* --- SOL TARAF: OYLAMA SÜTUNU (Gri Kutu İçinde) --- */}
        <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 border border-slate-100 rounded-xl h-fit min-w-[3.5rem]">
          <button 
            onClick={() => handleVote(1)}
            disabled={!currentUserId}
            className={cn(
              "p-1.5 rounded-lg transition-all active:scale-90",
              optimisticVote.vote === 1 
                ? "bg-green-100 text-green-600" 
                : "text-slate-400 hover:bg-white hover:text-amber-500 hover:shadow-sm"
            )}
          >
            <ChevronUp size={24} strokeWidth={3} />
          </button>
          
          <span className={cn(
            "font-black text-lg",
            optimisticVote.vote === 1 && "text-green-600",
            optimisticVote.vote === -1 && "text-red-500",
            optimisticVote.vote === 0 && "text-slate-700"
          )}>
            {optimisticVote.score}
          </span>

          <button 
            onClick={() => handleVote(-1)}
            disabled={!currentUserId}
            className={cn(
              "p-1.5 rounded-lg transition-all active:scale-90",
              optimisticVote.vote === -1 
                ? "bg-red-100 text-red-600" 
                : "text-slate-400 hover:bg-white hover:text-amber-500 hover:shadow-sm"
            )}
          >
            <ChevronDown size={24} strokeWidth={3} />
          </button>
        </div>

        {/* --- SAĞ TARAF: İÇERİK ALANI --- */}
        <div className="flex-1 min-w-0">
          
          {/* 1. HEADER */}
          <div className="flex items-center gap-3 mb-4">
            {isAI ? (
              // AI HEADER (Lacivert/İndigo Temalı)
              <>
                <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                  <Bot className="text-white w-6 h-6" />
                </div>
                <div>
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className="text-base font-black text-slate-900">Babylexit Intelligence</span>
                     <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wide">
                        <Sparkles size={10} fill="currentColor" /> Premium
                     </span>
                   </div>
                   <span className="text-xs font-medium text-indigo-600/80">Yapay Zeka Destekli Analiz</span>
                </div>
              </>
            ) : (
              // USER HEADER (Temiz Tasarım)
              <>
                <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                   {authorAvatar ? (
                       <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                   ) : (
                       <User className="text-slate-300 w-6 h-6" />
                   )}
                </div>
                <div className="flex flex-col leading-tight">
                   {/* İsim ve Rozetler */}
                   <div className="flex items-center gap-2">
                     <span className="text-base font-bold text-slate-900">
                        {authorName}
                     </span>
                     
                     {/* Otorite Rozeti (Lacivert) */}
                     {aiEndorsements > 5 && (
                       <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-100" title="Yüksek Otorite">
                         <Award size={12} /> Uzman
                       </div>
                     )}
                   </div>

                   <div className="flex items-center gap-2 text-xs text-slate-500">
                      {authorUsername && <span className="font-medium">@{authorUsername}</span>}
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{new Date(answer.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}</span>
                   </div>
                </div>
              </>
            )}
          </div>

          {/* 2. İÇERİK METNİ */}
          <div className={cn(
            "prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-[15px]",
            isAI && "text-slate-800"
          )}>
            {answer.content}
          </div>

          {/* 3. AI UYARI KUTUSU (Turuncu Temalı) */}
          {isAI && (
            <div className="mt-5 flex gap-3 p-4 rounded-xl bg-orange-50 border border-orange-100/60">
              <div className="bg-orange-100 p-1.5 rounded-full h-fit">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-bold text-orange-800 uppercase tracking-wide text-[10px]">Yasal Uyarı</p>
                <p>
                  Bu cevap yapay zeka tarafından üretilmiştir ve profesyonel hukuki/tıbbi tavsiye yerine geçmez. 
                  Lütfen bilgileri yetkili bir uzmanla teyit ediniz.
                </p>
              </div>
            </div>
          )}

          {/* 4. FOOTER */}
          {isAI && (
            <div className="flex items-center justify-end mt-4 pt-3 border-t border-indigo-100/50">
               <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                 <ShieldCheck size={14} />
                 Doğrulanmış Sistem Cevabı
               </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}