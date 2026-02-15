'use client';

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import toast from 'react-hot-toast'; 

// Server Actions
import { voteDailyDebate, confirmVoteChange, type Debate } from "@/app/actions/debate";

// Components
import PersuasionModal from "./PersuasionModal";
import DebateCommentColumn from "./DebateCommentColumn"; // YENİ: Yorum bileşeni eklendi

interface DebateCardProps {
  debate: Debate;
}

export default function DebateCard({ debate }: DebateCardProps) {
  const [isPending, startTransition] = useTransition();

  // --- LOCAL STATE ---
  const [stats, setStats] = useState(debate.stats);
  const [userVote, setUserVote] = useState(debate.userVote);
  
  // YENİ: Yorumları Göster/Gizle
  const [showComments, setShowComments] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidates, setModalCandidates] = useState<any[]>([]);
  const [pendingChoice, setPendingChoice] = useState<'A' | 'B' | null>(null);

  // İstatistik Hesaplamaları (Hata Korumalı)
  const safeStats = stats || { a: 0, b: 0 };
  const total = (safeStats.a || 0) + (safeStats.b || 0);
  const percentA = total === 0 ? 50 : Math.round((safeStats.a / total) * 100);
  const percentB = total === 0 ? 50 : 100 - percentA;

  // --- OY VERME İŞLEMİ ---
  const handleVote = (choice: 'A' | 'B') => {
    if (userVote === choice) return;

    startTransition(async () => {
        // 1. Optimistic Update
        const previousStats = { ...safeStats };
        const previousVote = userVote;

        setUserVote(choice);
        setStats(prev => {
             const current = prev || { a: 0, b: 0 };
             const isSwitching = previousVote !== null;
             // Tip güvenliği için cast işlemi
             const prevA = current.a || 0;
             const prevB = current.b || 0;

             return {
                 ...current,
                 a: choice === 'A' ? prevA + 1 : (previousVote === 'A' ? prevA - 1 : prevA),
                 b: choice === 'B' ? prevB + 1 : (previousVote === 'B' ? prevB - 1 : prevB),
                 total: (current.total || 0) + (isSwitching ? 0 : 1)
             };
        });

        // 2. Server Action
        const result = await voteDailyDebate(debate.id, choice);

        if (result.success) {
            toast.success("Oyunuz Kaydedildi");
            if (result.newStats) setStats({ ...result.newStats, total: result.newStats.a + result.newStats.b });
            
            // YENİ: İlk kez oy verince yorumları aç (Teşvik)
            if (!previousVote) setShowComments(true);
        } 
        else if (result.requiresPersuasion) {
             setModalCandidates(result.candidates || []);
             setPendingChoice(choice);
             setIsModalOpen(true);
             
             setUserVote(previousVote);
             setStats(previousStats);
        } 
        else {
             toast.error(result.error || "İşlem başarısız");
             setUserVote(previousVote);
             setStats(previousStats);
        }
    });
  };

  // --- MODAL ONAYI ---
  const handlePersuasionConfirm = (commentId: string) => {
      if (!pendingChoice) return;

      startTransition(async () => {
          const result = await confirmVoteChange(debate.id, pendingChoice, commentId);
          
          if (result.success) {
              setIsModalOpen(false);
              setUserVote(pendingChoice);
              if (result.newStats) setStats({ ...result.newStats, total: result.newStats.a + result.newStats.b });
              toast.success("Fikir Değişikliği Onaylandı!");
          } else {
              toast.error(result.error || "Hata oluştu");
          }
      });
  };

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
        
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
            <div className="flex gap-3">
               <Avatar className="h-10 w-10 border border-slate-100">
                 <AvatarImage src={debate.created_by?.avatar_url} />
                 <AvatarFallback className="bg-slate-100 text-slate-500">
                    {debate.created_by?.full_name?.substring(0,2).toUpperCase() || "??"}
                 </AvatarFallback>
               </Avatar>
               <div>
                  <p className="text-sm font-bold text-slate-900">{debate.created_by?.full_name || "Anonim"}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                     {debate.created_by?.job_title && <span>{debate.created_by.job_title} • </span>}
                     {formatDistanceToNow(new Date(debate.created_at || new Date()), { addSuffix: true, locale: tr })}
                  </p>
               </div>
            </div>
            {debate.is_active && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    CANLI
                </span>
            )}
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-4">
            <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">
                    {debate.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">
                    {debate.description}
                </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
                     <span className={cn("transition-colors", userVote === 'A' ? "text-indigo-600" : "text-slate-400")}>
                        A: Katılıyorum (%{percentA})
                     </span>
                     <span className={cn("transition-colors", userVote === 'B' ? "text-rose-600" : "text-slate-400")}>
                        B: Katılmıyorum (%{percentB})
                     </span>
                </div>
                <div className="h-2 w-full flex rounded-full overflow-hidden bg-white border border-slate-100 mb-3 relative">
                    <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${percentA}%` }} />
                    <div className="h-full bg-rose-500 transition-all duration-700 ease-out" style={{ width: `${percentB}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button 
                        disabled={isPending}
                        onClick={() => handleVote('A')}
                        variant="outline"
                        className={cn(
                            "h-9 text-xs font-bold border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all active:scale-95",
                            userVote === 'A' && "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white border-indigo-600 shadow-md shadow-indigo-100"
                        )}
                    >
                        {isPending && pendingChoice === 'A' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : (userVote === 'A' && <Check className="w-3 h-3 mr-1" />)}
                        A Tarafı
                    </Button>

                    <Button 
                        disabled={isPending}
                        onClick={() => handleVote('B')}
                        variant="outline"
                        className={cn(
                            "h-9 text-xs font-bold border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all active:scale-95",
                            userVote === 'B' && "bg-rose-600 text-white hover:bg-rose-700 hover:text-white border-rose-600 shadow-md shadow-rose-100"
                        )}
                    >
                        {isPending && pendingChoice === 'B' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : (userVote === 'B' && <Check className="w-3 h-3 mr-1" />)}
                        B Tarafı
                    </Button>
                </div>
            </div>
        </CardContent>

        {/* FOOTER & ACTIONS */}
        <CardFooter className="p-0 flex flex-col items-stretch border-t border-slate-100 bg-slate-50/50">
             <div className="flex justify-between items-center p-3 w-full">
                 <div className="flex gap-2">
                     <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                        className={cn(
                            "h-8 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 gap-1.5 transition-colors",
                            showComments && "bg-slate-100 text-indigo-600"
                        )}
                     >
                        <MessageCircle size={15} />
                        <span>Tartışma</span>
                        {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                     </Button>

                     <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 gap-1.5"
                     >
                        <Share2 size={15} />
                        <span>Paylaş</span>
                     </Button>
                 </div>
                 
                 <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                     {total} Oy
                 </div>
             </div>

             {/* YORUM BÖLÜMÜ (Burada açılıp kapanıyor) */}
             <AnimatePresence>
                 {showComments && (
                     <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-100 bg-slate-50"
                     >
                         <DebateCommentColumn 
                            debateId={debate.id} 
                            userVote={userVote} 
                            isOpen={showComments} 
                         />
                     </motion.div>
                 )}
             </AnimatePresence>
        </CardFooter>
      </Card>
    </motion.div>

    <PersuasionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidates={modalCandidates}
        onConfirm={handlePersuasionConfirm}
        isSubmitting={isPending}
        targetSide={pendingChoice || 'A'}
    />
    </>
  );
}