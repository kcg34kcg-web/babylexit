'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { rateAIResponse } from '@/app/actions/ai-feedback';
import { toast } from 'sonner';

interface AIFeedbackProps {
  questionTitle: string;
}

export default function AIFeedback({ questionTitle }: AIFeedbackProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  const handleVote = async (type: 'up' | 'down') => {
    if (voted) return; // Zaten oy verdiyse engelle
    
    setVoted(type);
    
    // Server action'ı çağır
    await rateAIResponse(questionTitle, type === 'up');
    
    if (type === 'up') {
      toast.success("Geri bildiriminiz için teşekkürler! (Sistem bunu öğrendi)");
    } else {
      toast.error("Üzgünüz. Bu cevabı sistemden sildik, bir dahakine daha iyisini üreteceğiz.");
    }
  };

  if (voted) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 mt-2 bg-green-50 p-2 rounded-lg w-fit">
        <Check size={14} /> Geri bildiriminiz alındı. Teşekkürler!
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
      <span className="text-xs text-gray-500">Bu yapay zeka cevabı faydalı mıydı?</span>
      <div className="flex gap-2">
        <button
          onClick={() => handleVote('up')}
          className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-md transition-colors"
          title="Faydalı"
        >
          <ThumbsUp size={16} />
        </button>
        <button
          onClick={() => handleVote('down')}
          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-md transition-colors"
          title="Faydalı Değil"
        >
          <ThumbsDown size={16} />
        </button>
      </div>
    </div>
  );
}