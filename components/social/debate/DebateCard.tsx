'use client';

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Share2, AlertCircle, Loader2, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { useToast } from "@/hooks/use-toast";

// Server Actions
import { voteDailyDebate, confirmVoteChange, type Debate } from "@/app/actions/debate";

// Components
import PersuasionModal from "./PersuasionModal";

interface DebateCardProps {
  debate: Debate;
}

export default function DebateCard({ debate }: DebateCardProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // --- LOCAL STATE (OPTIMISTIC UI) ---
  const [stats, setStats] = useState(debate.stats);
  const [userVote, setUserVote] = useState(debate.userVote);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidates, setModalCandidates] = useState<any[]>([]);
  const [pendingChoice, setPendingChoice] = useState<'A' | 'B' | null>(null);

  // İstatistik Hesaplamaları
  const total = stats.a + stats.b;
  const percentA = total === 0 ? 50 : Math.round((stats.a / total) * 100);
  const percentB = total === 0 ? 50 : 100 - percentA;

  // --- OY VERME İŞLEMİ ---
  const handleVote = (choice: 'A' | 'B') => {
    if (userVote === choice) return;

    startTransition(async () => {
        // 1. Optimistic Update
        const previousStats = { ...stats };
        const previousVote = userVote;

        setUserVote(choice);
        setStats(prev => {
             const isSwitching = previousVote !== null;
             return {
                 ...prev,
                 [choice.toLowerCase()]: prev[choice.toLowerCase() as 'a'|'b'] + 1,
                 [previousVote?.toLowerCase() as 'a'|'b' || '']: isSwitching 
                    ? prev[previousVote?.toLowerCase() as 'a'|'b' || 'a'] - 1 
                    : prev[previousVote?.toLowerCase() as 'a'|'b' || 'a'] // Değişmiyorsa dokunma
             };
        });

        // 2. Server Action
        const result = await voteDailyDebate(debate.id, choice);

        if (result.success) {
            toast({ title: "Oyunuz Alındı", description: "Münazaraya katılımın için teşekkürler." });
            if (result.newStats) setStats({ ...result.newStats, total: result.newStats.a + result.newStats.b });
        } 
        else if (result.requiresPersuasion) {
             // İKNA MODALINI AÇ
             setModalCandidates(result.candidates || []);
             setPendingChoice(choice);
             setIsModalOpen(true);
             
             // UI Geri Al (Rollback)
             setUserVote(previousVote);
             setStats(previousStats);
        } 
        else {
             toast({ title: "Hata", description: result.error, variant: "destructive" });
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
              toast({ title: "Fikir Değişikliği Onaylandı", description: "Esnek düşünebildiğin için tebrikler!" });
          } else {
              toast({ title: "Hata", description: result.error, variant: "destructive" });
          }
      });
  };

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
        
        {/* HEADER: User Info & Time */}
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
           <div className="flex gap-3">
              <Avatar className="h-10 w-10 border border-slate-100">
                <AvatarImage src={debate.created_by?.avatar_url} />
                <AvatarFallback>{debate.created_by?.full_name?.substring(0,2) || "??"}</AvatarFallback>
              </Avatar>
              <div>
                 <p className="text-sm font-bold text-slate-900">{debate.created_by?.full_name || "Anonim"}</p>
                 <p className="text-xs text-slate-500 flex items-center gap-1">
                    {debate.created_by?.job_title && <span>{debate.created_by.job_title} • </span>}
                    {formatDistanceToNow(new Date(debate.created_by ? debate.created_at : new Date()), { addSuffix: true, locale: tr })}
                 </p>
              </div>
           </div>
           {debate.is_active && (
               <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                   CANLI
               </span>
           )}
        </CardHeader>

        {/* CONTENT: Title & Description */}
        <CardContent className="p-4 pt-2 space-y-4">
            <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">
                    {debate.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-3">
                    {debate.description}
                </p>
            </div>

            {/* VOTING AREA */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                {/* Progress Bar */}
                <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
                     <span className={cn(userVote === 'A' ? "text-indigo-600" : "text-slate-400")}>
                        A: Katılıyorum (%{percentA})
                     </span>
                     <span className={cn(userVote === 'B' ? "text-rose-600" : "text-slate-400")}>
                        B: Katılmıyorum (%{percentB})
                     </span>
                </div>
                <div className="h-2 w-full flex rounded-full overflow-hidden bg-white border border-slate-100 mb-3">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${percentA}%` }} />
                    <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${percentB}%` }} />
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <Button 
                        disabled={isPending}
                        onClick={() => handleVote('A')}
                        variant="outline"
                        className={cn(
                            "h-9 text-xs font-bold border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200",
                            userVote === 'A' && "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white border-indigo-600 shadow-md shadow-indigo-100"
                        )}
                    >
                       {isPending && userVote === 'A' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                       {userVote === 'A' && <Check className="w-3 h-3 mr-1" />}
                       A Tarafı
                    </Button>

                    <Button 
                        disabled={isPending}
                        onClick={() => handleVote('B')}
                        variant="outline"
                        className={cn(
                            "h-9 text-xs font-bold border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200",
                            userVote === 'B' && "bg-rose-600 text-white hover:bg-rose-700 hover:text-white border-rose-600 shadow-md shadow-rose-100"
                        )}
                    >
                       {isPending && userVote === 'B' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                       {userVote === 'B' && <Check className="w-3 h-3 mr-1" />}
                       B Tarafı
                    </Button>
                </div>
            </div>
        </CardContent>

        {/* FOOTER: Social Actions */}
        <CardFooter className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-slate-500">
             <div className="flex gap-4 text-xs font-medium">
                 <button className="flex items-center gap-1 hover:text-slate-800 transition-colors">
                    <MessageCircle size={16} />
                    <span>Tartışma</span>
                 </button>
                 <button className="flex items-center gap-1 hover:text-slate-800 transition-colors">
                    <Share2 size={16} />
                    <span>Paylaş</span>
                 </button>
             </div>
             <div className="text-[10px] font-medium text-slate-400">
                 {total} Oy
             </div>
        </CardFooter>
      </Card>
    </motion.div>

    {/* PERSUASION MODAL INTEGRATION */}
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