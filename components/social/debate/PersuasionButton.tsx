'use client';

import { useState, useTransition } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(initialCount);
  const [hasClicked, setHasClicked] = useState(false);

  const handlePersuade = () => {
    // Kural 1: Kendi tarafındaki yorumu "ikna edici" bulamazsın (Zaten aynısını düşünüyorsun)
    if (userSide === commentSide) {
        toast({
            title: "Zaten Bu Taraftasın",
            description: "Sadece karşıt görüşteki yorumlar seni ikna edebilir.",
            variant: "default"
        });
        return;
    }

    startTransition(async () => {
        // Optimistic Update
        setCount(prev => prev + 1);
        setHasClicked(true);

        const result = await markAsPersuasive(debateId, commentId, authorId);

        if (!result.success) {
            // Hata varsa geri al
            setCount(prev => prev - 1);
            setHasClicked(false);
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        } else {
            toast({ 
                title: "Puan Verildi", 
                description: "Bu yorumun değerini artırdın.",
                className: "bg-indigo-600 text-white border-none" 
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
        "h-7 px-2 text-[10px] font-medium transition-all rounded-full border border-transparent",
        hasClicked 
            ? "bg-indigo-100 text-indigo-700 border-indigo-200" 
            : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
      )}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin mr-1" />
      ) : (
        <BrainCircuit className={cn("w-3.5 h-3.5 mr-1", hasClicked && "fill-indigo-700")} />
      )}
      {count} İkna
    </Button>
  );
}