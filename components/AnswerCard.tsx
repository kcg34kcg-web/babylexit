'use client';

import { useOptimistic, startTransition } from 'react';
import { createClient } from '@/utils/supabase/client'; // Adjust path if using a different client creator
import { ChevronUp, ChevronDown, CheckCircle2, Bot } from 'lucide-react';
import { cn } from '@/utils/cn';interface AnswerCardProps {
  answer: {
    id: string;
    content: string;
    is_ai_generated: boolean;
    created_at: string;
    user_id: string; // To check if user is voting on own answer
  };
  currentUserVote?: number; // 1, -1, or null
  initialNetScore: number;
  currentUserId?: string;
}

export function AnswerCard({ answer, currentUserVote, initialNetScore, currentUserId }: AnswerCardProps) {
  const supabase = createClient();

  const [optimisticVote, addOptimisticVote] = useOptimistic(
    { vote: currentUserVote || 0, score: initialNetScore },
    (state, newVote: number) => {
      // Toggle logic: If clicking the same button, remove vote (0). Else, set to new vote.
      const finalVote = state.vote === newVote ? 0 : newVote;
      
      // Calculate score difference
      const diff = finalVote - state.vote;
      
      return {
        vote: finalVote,
        score: state.score + diff,
      };
    }
  );

  const handleVote = async (voteType: number) => {
    if (!currentUserId) return; // Prompt login in real app

    startTransition(() => {
      addOptimisticVote(voteType);
    });

    try {
      const finalVote = optimisticVote.vote === voteType ? 0 : voteType;

      if (finalVote === 0) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .match({ user_id: currentUserId, answer_id: answer.id });
      } else {
        // Upsert vote (handle constraints)
        await supabase
          .from('votes')
          .upsert(
            { user_id: currentUserId, answer_id: answer.id, vote_type: finalVote },
            { onConflict: 'user_id, answer_id' }
          );
      }
    } catch (error) {
      console.error("Voting failed", error);
      // Ideally revert optimistic state here via a toast or state rollback
    }
  };

  // Determine Styles based on is_ai_generated
  const isAI = answer.is_ai_generated;

  return (
    <div className={cn(
      "relative rounded-xl border p-6 transition-all",
      isAI 
        ? "bg-blue-50/50 border-blue-200 shadow-sm" 
        : "bg-white border-slate-200"
    )}>
      {/* AI Header / Badge */}
      {isAI && (
        <div className="flex items-center gap-2 mb-4 text-blue-700 font-semibold text-sm bg-blue-100/50 w-fit px-3 py-1 rounded-full border border-blue-200">
          <Bot size={18} />
          <span>Yapay Zeka Hukuk Görüşü</span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Voting Sidebar */}
        <div className="flex flex-col items-center gap-1 min-w-[3rem]">
          <button 
            onClick={() => handleVote(1)}
            disabled={!currentUserId}
            className={cn(
              "p-1 rounded hover:bg-slate-100 transition-colors",
              optimisticVote.vote === 1 ? "text-green-600" : "text-slate-400"
            )}
          >
            <ChevronUp size={32} strokeWidth={2.5} />
          </button>
          
          <span className={cn(
            "font-bold text-lg",
            optimisticVote.vote === 1 && "text-green-600",
            optimisticVote.vote === -1 && "text-red-600",
            optimisticVote.vote === 0 && "text-slate-700"
          )}>
            {optimisticVote.score}
          </span>

          <button 
            onClick={() => handleVote(-1)}
            disabled={!currentUserId}
            className={cn(
              "p-1 rounded hover:bg-slate-100 transition-colors",
              optimisticVote.vote === -1 ? "text-red-600" : "text-slate-400"
            )}
          >
            <ChevronDown size={32} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-3">
          <div className={cn(
            "prose prose-slate max-w-none text-slate-800 leading-relaxed",
            isAI && "text-sm font-medium"
          )}>
            {answer.content.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-2">{paragraph}</p>
            ))}
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
             <div className="flex items-center gap-2 text-xs text-slate-500">
                {isAI ? (
                  <span className="flex items-center gap-1 text-blue-600 font-medium">
                    <CheckCircle2 size={14} />
                    Babylexit AI tarafından oluşturuldu
                  </span>
                ) : (
                  <span>Kullanıcı yanıtı • {new Date(answer.created_at).toLocaleDateString('tr-TR')}</span>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}