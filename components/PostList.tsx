'use client';

import { useState, useEffect } from 'react';
import { Zap, ThumbsDown, Scale, MessageCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; 
import toast from 'react-hot-toast'; 

type ReactionType = 'woow' | 'doow' | 'adil';

interface ReactionBarProps {
  targetId: string;
  targetType: 'post' | 'comment'; 
  initialCounts?: { // Soru işareti ekledik (Opsiyonel olabilir)
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
  
  // 👇 DÜZELTME BURADA: Eğer initialCounts boş gelirse, bu varsayılan nesneyi kullan
  const [counts, setCounts] = useState(initialCounts || {
    woow: 0,
    doow: 0,
    adil: 0,
    comment_count: 0
  });

  const [myReaction, setMyReaction] = useState<ReactionType | null>(initialUserReaction);

  // Veri sonradan yüklenirse state'i güncelle (Opsiyonel güvenlik)
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

    // Yeni durumu hesaplarken 'counts' nesnesinin var olduğundan emin oluyoruz
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
    const base = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-none cursor-pointer select-none";
    
    if (myReaction === type) {
      if (type === 'woow') return `${base} bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm`;
      if (type === 'doow') return `${base} bg-red-500 text-white shadow-sm`;
      if (type === 'adil') return `${base} bg-green-500 text-white shadow-sm`;
    }

    return `${base} text-gray-500 bg-transparent hover:text-gray-700 active:scale-95`;
  };

  // Güvenlik kontrolü: Eğer counts hala yoksa render etme (veya 0 göster)
  if (!counts) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* WOOW BUTTON */}
      <button 
        onClick={() => handleReaction('woow')}
        className={`${getButtonClass('woow')} ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Woow"
      >
        <Zap className={`w-4 h-4 ${myReaction === 'woow' ? 'fill-white' : ''}`} />
        <span>{(counts.woow || 0) > 0 ? counts.woow : ''}</span>
      </button>

      {/* DOOW BUTTON */}
      <button 
        onClick={() => handleReaction('doow')}
        className={`${getButtonClass('doow')} ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Doow"
      >
        <ThumbsDown className={`w-4 h-4 ${myReaction === 'doow' ? 'fill-white' : ''}`} />
        <span>{(counts.doow || 0) > 0 ? counts.doow : ''}</span>
      </button>

      {/* ADIL BUTTON */}
      <button 
        onClick={() => handleReaction('adil')}
        className={`${getButtonClass('adil')} ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Adil"
      >
        <Scale className={`w-4 h-4 ${myReaction === 'adil' ? 'fill-white' : ''}`} />
        <span>{(counts.adil || 0) > 0 ? counts.adil : ''}</span>
      </button>

      {/* AYIRAÇ */}
      <div className="h-4 w-px bg-gray-200 mx-1"></div>

      {/* MÜZAKERE BUTTON */}
      <button 
        onClick={onMuzakereClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-blue-500 transition-none active:scale-95"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-blue-500">{(counts.comment_count || 0) > 0 ? counts.comment_count : ''}</span>
      </button>
    </div>
  );
}