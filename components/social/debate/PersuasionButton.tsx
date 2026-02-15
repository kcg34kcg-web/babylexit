'use client';

import { useState } from "react";
import { BrainCircuit, Lightbulb } from "lucide-react";
import { markAsPersuasive } from "@/app/actions/debate";
import { toast } from "react-hot-toast";
import { cn } from "@/utils/cn";

interface Props {
  debateId: string;
  commentId: string;
  authorId: string;
  initialCount: number;
  initialHasPersuaded: boolean;
  isOwnComment: boolean;
}

export default function PersuasionButton({ 
  debateId, 
  commentId, 
  authorId, 
  initialCount, 
  initialHasPersuaded,
  isOwnComment
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [hasPersuaded, setHasPersuaded] = useState(initialHasPersuaded);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isOwnComment) {
        toast.error("Kendi yorumuna ikna puanı veremezsin.");
        return;
    }
    if (hasPersuaded) {
        toast("Zaten bu görüşe puan verdin.", { icon: "💡" });
        return;
    }
    if (loading) return;

    // Optimistic Update (Anında arayüz tepkisi)
    setLoading(true);
    setHasPersuaded(true);
    setCount(prev => prev + 1);

    const res = await markAsPersuasive(debateId, commentId, authorId);

    if (res.error) {
        // Hata olursa geri al
        setHasPersuaded(false);
        setCount(prev => prev - 1);
        toast.error(res.error);
    } else {
        toast.success("İkna Puanı gönderildi! 🧠");
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isOwnComment || hasPersuaded || loading}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-300 min-w-[45px]",
        hasPersuaded 
            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200" 
            : "bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50",
        isOwnComment && "opacity-50 cursor-not-allowed hover:border-slate-200 hover:bg-white hover:text-slate-400"
      )}
      title={isOwnComment ? "Kendi yorumun" : "Bu görüş beni ikna etti"}
    >
      <div className={cn("transition-transform duration-300", hasPersuaded ? "scale-110" : "scale-100")}>
         {hasPersuaded ? <BrainCircuit size={18} /> : <Lightbulb size={18} />}
      </div>
      <span className={cn("text-[10px] font-bold mt-0.5", hasPersuaded ? "text-white" : "text-slate-500")}>
        {count}
      </span>
    </button>
  );
}