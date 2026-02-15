'use client';

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Loader2, Check, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
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
import DebateCommentColumn from "./DebateCommentColumn"; 

interface DebateCardProps {
  debate: Debate;
}

export default function DebateCard({ debate }: DebateCardProps) {
  const [isPending, startTransition] = useTransition();

  // --- LOCAL STATE ---
  const [stats, setStats] = useState(debate.stats);
  const [userVote, setUserVote] = useState(debate.userVote);
  const [showComments, setShowComments] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidates, setModalCandidates] = useState<any[]>([]);
  const [pendingChoice, setPendingChoice] = useState<'A' | 'B' | null>(null);

  // İstatistik Hesaplamaları
  const safeStats = stats || { a: 0, b: 0 };
  const total = (safeStats.a || 0) + (safeStats.b || 0);
  
  // Yüzdeler
  const percentA = total > 0 ? Math.round((safeStats.a / total) * 100) : 0;
  const percentB = total > 0 ? Math.round((safeStats.b / total) * 100) : 0;

  // Sürpriz Oylama: Kullanıcı oy verdi mi?
  const hasVoted = !!userVote;

  // --- OY VERME İŞLEMİ ---
  const handleVote = (choice: 'A' | 'B') => {
    if (userVote === choice) return;

    startTransition(async () => {
        // Optimistic Update
        const previousStats = { ...safeStats };
        const previousVote = userVote;

        setUserVote(choice);
        setStats(prev => {
             const current = prev || { a: 0, b: 0 };
             const isSwitching = previousVote !== null;
             const prevA = current.a || 0;
             const prevB = current.b || 0;

             return {
                 ...current,
                 a: choice === 'A' ? prevA + 1 : (previousVote === 'A' ? prevA - 1 : prevA),
                 b: choice === 'B' ? prevB + 1 : (previousVote === 'B' ? prevB - 1 : prevB),
                 total: (current.total || 0) + (isSwitching ? 0 : 1)
             };
        });

        const result = await voteDailyDebate(debate.id, choice);

        if (result.success) {
            toast.success("Oyunuz Kaydedildi");
            if (result.newStats) setStats({ ...result.newStats, total: result.newStats.a + result.newStats.b });
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
        
        {/* HEADER */}
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
            {/* BAŞLIK VE AÇIKLAMA */}
            <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">
                    {debate.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">
                    {debate.description}
                </p>
            </div>

            {/* --- GÜNCELLENEN OYLAMA ALANI --- */}
            {/* Sürpriz Oylama: Oranlar butonların içinde gizli/gömülü */}
            <div className="flex gap-3 w-full mt-2">
              
              {/* --- YEŞİL BUTON: KATILIYORUM --- */}
              <button
                onClick={() => handleVote('A')}
                disabled={isPending}
                className={cn(
                  "relative flex-1 h-12 rounded-xl overflow-hidden transition-all duration-300 group",
                  hasVoted 
                    ? "border-emerald-600/20 bg-emerald-50 cursor-default" // Oy verildikten sonra zemin
                    : "border-2 border-emerald-100 bg-white hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer active:scale-95" // Oy vermeden önce
                )}
              >
                {/* Progress Bar (Sadece oy verildiyse dolar) */}
                {hasVoted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentA}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-emerald-500/20 border-r border-emerald-500/30"
                  />
                )}

                {/* Metin Katmanı */}
                <div className="relative z-10 flex items-center justify-center w-full h-full gap-2">
                    {isPending && userVote === 'A' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    ) : (
                        <span className={cn(
                            "font-bold uppercase tracking-wide transition-all flex items-center gap-1",
                            hasVoted ? "text-emerald-800 text-sm" : "text-emerald-600 text-base"
                        )}>
                            {/* Seçiliyse Tik İşareti */}
                            {userVote === 'A' && <Check className="w-4 h-4" />}
                            KATILIYORUM
                            {/* Oy verildiyse yüzdeyi göster */}
                            {hasVoted && <span className="ml-1 opacity-100">({percentA}%)</span>}
                        </span>
                    )}
                </div>
              </button>

              {/* --- KIRMIZI BUTON: KATILMIYORUM --- */}
              <button
                onClick={() => handleVote('B')}
                disabled={isPending}
                className={cn(
                  "relative flex-1 h-12 rounded-xl overflow-hidden transition-all duration-300 group",
                  hasVoted 
                    ? "border-rose-600/20 bg-rose-50 cursor-default" 
                    : "border-2 border-rose-100 bg-white hover:border-rose-500 hover:bg-rose-50 cursor-pointer active:scale-95"
                )}
              >
                {/* Progress Bar */}
                {hasVoted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentB}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-rose-500/20 border-r border-rose-500/30"
                  />
                )}

                {/* Metin Katmanı */}
                <div className="relative z-10 flex items-center justify-center w-full h-full gap-2">
                    {isPending && userVote === 'B' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
                    ) : (
                        <span className={cn(
                            "font-bold uppercase tracking-wide transition-all flex items-center gap-1",
                            hasVoted ? "text-rose-800 text-sm" : "text-rose-600 text-base"
                        )}>
                             {userVote === 'B' && <Check className="w-4 h-4" />}
                            KATILMIYORUM
                            {hasVoted && <span className="ml-1 opacity-100">({percentB}%)</span>}
                        </span>
                    )}
                </div>
              </button>
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
                 
                 <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                     <TrendingUp className="w-3 h-3" />
                     {total} Oy
                 </div>
             </div>

             {/* YORUM BÖLÜMÜ (Orijinal DebateCommentColumn kullanıldı) */}
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