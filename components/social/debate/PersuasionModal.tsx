'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BrainCircuit, CheckCircle2, Quote } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn";

interface Candidate {
  id: string;
  content: string;
  persuasion_count: number;
  profiles: {
    full_name: string;
    avatar_url: string;
    job_title: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onConfirm: (commentId: string) => void;
  isSubmitting: boolean;
  targetSide: 'A' | 'B';
}

export default function PersuasionModal({ 
  isOpen, 
  onClose, 
  candidates, 
  onConfirm, 
  isSubmitting,
  targetSide 
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedId) {
      onConfirm(selectedId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-50 border-slate-200 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 p-2 rounded-full">
                <BrainCircuit className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-800">Fikir Değişikliği</DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 font-medium">
            Taraf değiştirmek üzeresin ({targetSide} Tarafına). <br/>
            Bu kararında seni en çok hangi görüş etkiledi?
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
           {candidates.map((item) => (
             <div 
               key={item.id}
               onClick={() => setSelectedId(item.id)}
               className={cn(
                 "relative p-4 rounded-xl border-2 transition-all cursor-pointer group",
                 selectedId === item.id 
                    ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/10" 
                    : "bg-white border-transparent hover:border-slate-300 shadow-sm"
               )}
             >
                {/* Seçim İkonu */}
                <div className={cn(
                    "absolute top-3 right-3 transition-all duration-300",
                    selectedId === item.id ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )}>
                    <CheckCircle2 className="text-indigo-600 fill-indigo-50" />
                </div>

                <div className="flex gap-3">
                   <Avatar className="w-10 h-10 border border-slate-100">
                     <AvatarImage src={item.profiles?.avatar_url} />
                     <AvatarFallback>{item.profiles?.full_name?.substring(0,2)}</AvatarFallback>
                   </Avatar>
                   <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-slate-800">{item.profiles?.full_name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            {item.persuasion_count} ikna
                          </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed relative pl-2">
                         <span className="absolute left-0 top-0 w-0.5 h-full bg-slate-200 rounded-full" />
                         "{item.content}"
                      </p>
                   </div>
                </div>
             </div>
           ))}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Vazgeç
            </Button>
            <Button 
                onClick={handleConfirm} 
                disabled={!selectedId || isSubmitting}
                className={cn(
                    "font-bold transition-all",
                    selectedId ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 cursor-not-allowed"
                )}
            >
                {isSubmitting ? "Kaydediliyor..." : "Bu Yorum İkna Etti"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}