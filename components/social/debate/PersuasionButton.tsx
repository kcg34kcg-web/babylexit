'use client';

import { useState, useTransition } from "react";
import { Star, Loader2 } from "lucide-react"; // BrainCircuit yerine Star
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { markAsPersuasive } from "@/app/actions/debate";
import { cn } from "@/utils/cn";

interface Props {
  debateId: string;
  commentId: string;
  authorId: string;
  initialCount: number;
  userSide: 'A' | 'B' | null;
  commentSide: 'A' | 'B';
}

export default function PersuasionButton({ 
  debateId, 
  commentId, 
  authorId, 
  initialCount,
  userSide,
  commentSide 
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(initialCount);
  const [hasClicked, setHasClicked] = useState(false);

  const handlePersuade = () => {
    // 1. Kendi tarafındakine yıldız veremezsin (Mantık kuralı)
    if (userSide === commentSide) {
        toast.error("Kendi tarafını ikna edemezsin! Sadece karşıt görüşe yıldız verebilirsin.");
        return;
    }

    // 2. Taraf seçmemişse
    if (!userSide) {
        toast.error("Yıldız vermek için önce tarafını seçmelisin.");
        return;
    }

    startTransition(async () => {
        // Optimistic Update
        setCount(prev => prev + 1);
        setHasClicked(true);

        const result = await markAsPersuasive(debateId, commentId, authorId);

        if (!result.success) {
            setCount(prev => prev - 1);
            setHasClicked(false);
            toast.error(result.error || "İşlem başarısız");
        } else {
            toast.success("Yorumu Yıldızladın! ✨", {
                style: {
                    background: '#FEF3C7',
                    color: '#D97706',
                    border: '1px solid #FCD34D'
                },
                icon: '⭐'
            });
        }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handlePersuade}
      disabled={isPending || hasClicked || !userSide}
      className={cn(
        "h-7 px-2.5 text-[11px] font-bold transition-all rounded-full border shadow-sm group",
        hasClicked 
            ? "bg-amber-100 text-amber-700 border-amber-200" 
            : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50"
      )}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
      ) : (
        <Star 
            className={cn(
                "w-3.5 h-3.5 mr-1.5 transition-all", 
                hasClicked ? "fill-amber-500 text-amber-500" : "text-slate-300 group-hover:text-amber-500"
            )} 
        />
      )}
      {count}
    </Button>
  );
}