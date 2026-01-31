'use client';

import { useState } from 'react';
import { Zap, ThumbsDown, Scale, MessageCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; 
import toast from 'react-hot-toast'; // DÜZELTME: sonner yerine react-hot-toast

type ReactionType = 'woow' | 'doow' | 'adil';

interface ReactionBarProps {
  targetId: string;
  targetType: 'post' | 'comment'; 
  initialCounts: {
    woow: number;
    doow: number;
    adil: number;
    comment_count: number;
  };
  initialUserReaction: ReactionType | null;
  onCommentClick?: () => void; 
}

export default function ReactionBar({
  targetId,
  targetType,
  initialCounts,
  initialUserReaction,
  onCommentClick
}: ReactionBarProps) {
  // 1. ISOLATION: Yerel state (Anlık UI güncellemesi için)
  const [counts, setCounts] = useState(initialCounts);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(initialUserReaction);
  
  // 2. LOGIC: Optimistik Güncelleme
  const handleReaction = async (newReaction: ReactionType) => {
    // A. Önceki durumu sakla (Hata olursa geri almak için)
    const prevReaction = myReaction;
    const prevCounts = { ...counts };

    // B. Yeni durumu hesapla
    let newCounts = { ...counts };

    if (prevReaction === newReaction) {
      // Reaksiyonu geri çekme (Toggle Off)
      setMyReaction(null);
      newCounts[newReaction] -= 1;
    } else {
      // Yeni reaksiyon ekleme veya değiştirme
      if (prevReaction) {
        newCounts[prevReaction] -= 1; // Eskisini azalt
      }
      newCounts[newReaction] += 1; // Yenisini artır
      setMyReaction(newReaction);
    }

    // C. UI'ı anında güncelle
    setCounts(newCounts);

    // D. Supabase'e gönder (Arka planda)
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
      // Hata durumunda geri al (Rollback)
      setMyReaction(prevReaction);
      setCounts(prevCounts);
      toast.error('Reaksiyon kaydedilemedi'); // react-hot-toast kullanımı
    }
  };

  // 3. GÖRSEL AYARLAR (Renkler ve Stil)
  const getButtonClass = (type: ReactionType) => {
    const base = "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-none cursor-pointer select-none";
    
    // Aktif Durumlar (Phase 1 Kuralları)
    if (myReaction === type) {
      if (type === 'woow') return `${base} bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm`;
      if (type === 'doow') return `${base} bg-red-500 text-white shadow-sm`;
      if (type === 'adil') return `${base} bg-green-500 text-white shadow-sm`;
    }

    // Pasif Durumlar (Yazısız, sadece ikon ve sayı)
    return `${base} text-gray-500 bg-transparent hover:text-gray-700 active:scale-95`;
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* WOOW BUTTON */}
      <button 
        onClick={() => handleReaction('woow')}
        className={getButtonClass('woow')}
        aria-label="Woow"
      >
        <Zap className={`w-4 h-4 ${myReaction === 'woow' ? 'fill-white' : ''}`} />
        <span>{counts.woow > 0 ? counts.woow : ''}</span>
      </button>

      {/* DOOW BUTTON */}
      <button 
        onClick={() => handleReaction('doow')}
        className={getButtonClass('doow')}
        aria-label="Doow"
      >
        <ThumbsDown className={`w-4 h-4 ${myReaction === 'doow' ? 'fill-white' : ''}`} />
        <span>{counts.doow > 0 ? counts.doow : ''}</span>
      </button>

      {/* ADIL BUTTON */}
      <button 
        onClick={() => handleReaction('adil')}
        className={getButtonClass('adil')}
        aria-label="Adil"
      >
        <Scale className={`w-4 h-4 ${myReaction === 'adil' ? 'fill-white' : ''}`} />
        <span>{counts.adil > 0 ? counts.adil : ''}</span>
      </button>

      {/* AYIRAÇ */}
      <div className="h-4 w-px bg-gray-200 mx-1"></div>

      {/* MÜZAKERE (YORUM) BUTTON */}
      <button 
        onClick={onCommentClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-blue-500 transition-none active:scale-95"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-blue-500">{counts.comment_count > 0 ? counts.comment_count : ''}</span>
      </button>
    </div>
  );
}