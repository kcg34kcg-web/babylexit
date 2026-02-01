"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/favorite";
import { cn } from "@/utils/cn";

interface FavoriteButtonProps {
  itemId: string;
  initialIsFavorited: boolean;
  type?: 'question' | 'answer';
}

export default function FavoriteButton({ itemId, initialIsFavorited, type = 'question' }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Link'e tıklamayı engelle
    e.stopPropagation();
    
    if (loading) return;
    setLoading(true);

    // Optimistic UI (Sonuç gelmeden rengi değiştiriyoruz, daha hızlı hissettirir)
    const newState = !isFavorited;
    setIsFavorited(newState);

    await toggleFavoriteAction(itemId, type);
    setLoading(false);
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "p-2 rounded-full transition-all active:scale-90",
        isFavorited ? "bg-orange-50" : "hover:bg-gray-100"
      )}
    >
      <Star 
        size={22} 
        className={cn(
          "transition-colors duration-300",
          isFavorited 
            ? "fill-gold-star text-gold-star animate-bounce-slight" 
            : "text-gray-400"
        )} 
      />
    </button>
  );
}