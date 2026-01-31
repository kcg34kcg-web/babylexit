'use client';

import { useState, useEffect } from 'react';
// 👇 İKON GÜNCELLEMESİ: Yıldız (Star) ikonu eklendi
import { Star, ThumbsDown, Scale, MessageCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; 
import toast from 'react-hot-toast'; 

type ReactionType = 'woow' | 'doow' | 'adil';

interface ReactionBarProps {
  targetId: string;
  targetType: 'post' | 'comment'; 
  initialCounts?: {
    woow: number;
    doow: number;
    adil: number;
    comment_count: number;
  };
  initialUserReaction: ReactionType | null;
  isOwner?: boolean;
  onMuzakereClick?: () => void; 
}

export default function ReactionBar({
  targetId,
  targetType,
  initialCounts,
  initialUserReaction,
  isOwner = false,
  onMuzakereClick
}: ReactionBarProps) {
  
  const [counts, setCounts] = useState(initialCounts || {
    woow: 0,
    doow: 0,
    adil: 0,
    comment_count: 0
  });

  const [myReaction, setMyReaction] = useState<ReactionType | null>(initialUserReaction);

  useEffect(() => {
    if (initialCounts) {
      setCounts(initialCounts);
    }
  }, [initialCounts]);
  
  const handleReaction = async (newReaction: ReactionType) => {
    if (isOwner) {
       toast.error("Kendi gönderinize oy veremezsiniz.");
       return;
    }

    const prevReaction = myReaction;
    const prevCounts = { ...counts };
    let newCounts = { ...counts };

    if (prevReaction === newReaction) {
      setMyReaction(null);
      newCounts[newReaction] = Math.max(0, newCounts[newReaction] - 1);
    } else {
      if (prevReaction) {
        newCounts[prevReaction] = Math.max(0, newCounts[prevReaction] - 1);
      }
      newCounts[newReaction] += 1;
      setMyReaction(newReaction);
    }

    setCounts(newCounts);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('handle_reaction', {
        p_target_id: targetId,
        p_target_type: targetType, 
        p_reaction_type: prevReaction === newReaction ? null : newReaction 
      });

      if (error) throw error;

    } catch (error) {
      console.error('Reaction failed:', error);
      setMyReaction(prevReaction);
      setCounts(prevCounts);
      toast.error('Reaksiyon kaydedilemedi'); 
    }
  };

  const getButtonClass = (type: ReactionType) => {
    // Ortak temel stil (Hızlı tepki için 'duration-200' yapıldı)
    const base = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-transform duration-200 cursor-pointer select-none active:scale-95";
    
    // AKTİF DURUMLAR
    if (myReaction === type) {
      
      // ⭐ YENİ WOOW STİLİ (Kırmızı-Pembe-Mor Degrade)
      if (type === 'woow') {
        return `
          flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold 
          transition-transform duration-200 active:scale-90
          text-white
          bg-gradient-to-r from-red-500 via-pink-500 to-purple-600
          shadow-lg shadow-pink-500/30
          border border-white/20
        `;
      }

      // Klasik Doow
      if (type === 'doow') return `${base} bg-red-500 text-white shadow-sm hover:bg-red-600`;
      
      // Klasik Adil
      if (type === 'adil') return `${base} bg-green-500 text-white shadow-sm hover:bg-green-600`;
    }

    // PASİF DURUMLAR
    // Woow pasifken pembeleşsin
    if (type === 'woow') return `${base} text-slate-500 hover:text-pink-600 hover:bg-pink-50`;

    return `${base} text-slate-500 bg-transparent hover:text-slate-700 hover:bg-slate-100`;
  };

  if (!counts) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* ⭐ WOOW (STAR) BUTTON */}
      <button 
        onClick={() => handleReaction('woow')}
        className={`${getButtonClass('woow')} ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Woow"
      >
        <Star 
          className={`
            transition-all duration-200
            ${myReaction === 'woow' ? 'w-4 h-4 text-white fill-white' : 'w-4 h-4'}
          `} 
        />
        <span>{(counts.woow || 0) > 0 ? counts.woow : ''}</span>
      </button>

      {/* 👎 DOOW BUTTON */}
      <button 
        onClick={() => handleReaction('doow')}
        className={`${getButtonClass('doow')} ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Doow"
      >
        <ThumbsDown className={`w-4 h-4 ${myReaction === 'doow' ? 'fill-white' : ''}`} />
        <span>{(counts.doow || 0) > 0 ? counts.doow : ''}</span>
      </button>

      {/* ⚖️ ADIL BUTTON */}
      <button 
        onClick={() => handleReaction('adil')}
        className={`${getButtonClass('adil')} ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Adil"
      >
        <Scale className={`w-4 h-4 ${myReaction === 'adil' ? 'fill-white' : ''}`} />
        <span>{(counts.adil || 0) > 0 ? counts.adil : ''}</span>
      </button>

      {/* AYIRAÇ */}
      <div className="h-4 w-px bg-slate-200 mx-1"></div>

      {/* 💬 MÜZAKERE BUTTON */}
      <button 
        onClick={onMuzakereClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-transform duration-200 active:scale-95"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-blue-500">{(counts.comment_count || 0) > 0 ? counts.comment_count : ''}</span>
      </button>
    </div>
  );
}