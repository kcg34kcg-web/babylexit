'use client';

import { useOptimistic, startTransition } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { ChevronUp, ChevronDown, CheckCircle2, Bot, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react'; // Yeni ikonlar eklendi
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
    };
    ai_score?: number; // Opsiyonel: Eğer backend'den geliyorsa kullanabiliriz
  };
  currentUserVote?: number;
  initialNetScore: number;
  currentUserId?: string;
}

export function AnswerCard({ answer, currentUserVote, initialNetScore, currentUserId }: AnswerCardProps) {
  const supabase = createClient();

  // --- OYLAMA MANTIĞI (MEVCUT KOD KORUNDU) ---
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
        await supabase
          .from('votes')
          .delete()
          .match({ user_id: currentUserId, answer_id: answer.id });
      } else {
        await supabase
          .from('votes')
          .upsert(
            { user_id: currentUserId, answer_id: answer.id, vote_type: finalVote },
            { onConflict: 'user_id, answer_id' }
          );
      }
    } catch (error) {
      console.error("Voting failed", error);
    }
  };

  const isAI = answer.is_ai_generated;

  // Kullanıcı Bilgileri
  const authorName = answer.profiles?.full_name || "İsimsiz Kullanıcı";
  const authorUsername = answer.profiles?.username;
  const authorAvatar = answer.profiles?.avatar_url;

  return (
    <div className={cn(
      "relative rounded-xl border p-6 transition-all",
      isAI 
        ? "bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
    )}>
      
      <div className="flex gap-4 md:gap-6">
        {/* --- SOL TARA: OYLAMA SÜTUNU --- */}
        <div className="flex flex-col items-center gap-1 min-w-[3rem]">
          <button 
            onClick={() => handleVote(1)}
            disabled={!currentUserId}
            className={cn(
              "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              optimisticVote.vote === 1 ? "text-green-600" : "text-slate-400"
            )}
          >
            <ChevronUp size={32} strokeWidth={2.5} />
          </button>
          
          <span className={cn(
            "font-bold text-lg",
            optimisticVote.vote === 1 && "text-green-600",
            optimisticVote.vote === -1 && "text-red-600",
            optimisticVote.vote === 0 && "text-slate-700 dark:text-slate-300"
          )}>
            {optimisticVote.score}
          </span>

          <button 
            onClick={() => handleVote(-1)}
            disabled={!currentUserId}
            className={cn(
              "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              optimisticVote.vote === -1 ? "text-red-600" : "text-slate-400"
            )}
          >
            <ChevronDown size={32} strokeWidth={2.5} />
          </button>
        </div>

        {/* --- SAĞ TARAF: İÇERİK ALANI --- */}
        <div className="flex-1 space-y-3">
          
          {/* 1. HEADER (KİM YAZDI?) */}
          <div className="flex items-center gap-3 mb-3">
            {isAI ? (
              // AI HEADER
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Bot className="text-white w-6 h-6" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-blue-700 dark:text-blue-400">Babylexit Intelligence</span>
                     <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <Sparkles size={10} /> PREMIUM
                     </span>
                   </div>
                   <span className="text-xs text-slate-500">Otomatik Analiz Sistemi</span>
                </div>
              </>
            ) : (
              // USER HEADER
              <>
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500">
                   {authorAvatar ? (
                       <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                   ) : (
                       authorName.charAt(0).toUpperCase()
                   )}
                </div>
                <div className="flex flex-col leading-tight">
                   <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                       {authorName}
                   </span>
                   {authorUsername && (
                       <span className="text-xs text-slate-500 font-medium">@{authorUsername}</span>
                   )}
                </div>
              </>
            )}
          </div>

          {/* 2. İÇERİK METNİ */}
          <div className={cn(
            "prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line",
            isAI && "text-[15px]" // AI fontu bir tık daha okunaklı olsun
          )}>
            {answer.content}
          </div>

          {/* 3. AI UYARI KUTUSU (Sadece AI ise göster) */}
          {isAI && (
            <div className="mt-4 flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-500">
                <p className="font-bold mb-0.5">Yasal Bilgilendirme</p>
                <p>
                  Bu cevap yapay zeka tarafından üretilmiştir ve profesyonel hukuki/tıbbi tavsiye yerine geçmez. 
                  Lütfen bilgileri yetkili bir uzmanla teyit ediniz.
                </p>
              </div>
            </div>
          )}

          {/* 4. FOOTER (Metadata) */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
             <div className="flex items-center gap-2 text-xs text-slate-500">
               {isAI ? (
                 <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                   <ShieldCheck size={14} />
                   Onaylı Sistem Cevabı
                 </span>
               ) : (
                 <span>{new Date(answer.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}</span>
               )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}