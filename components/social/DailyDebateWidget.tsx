'use client';

import { voteDailyDebate, confirmVoteChange, type Debate } from "@/app/actions/debate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";
import { Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
// YENİ MODAL IMPORT
import PersuasionModal from "@/components/social/debate/PersuasionModal";

interface Props {
  preloadedData?: Debate | null;
}

export default function DailyDebateWidget({ preloadedData }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [debate, setDebate] = useState<Debate | null>(preloadedData || null);
  const [stats, setStats] = useState({ a: 0, b: 0 });
  const [userVote, setUserVote] = useState<'A' | 'B' | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidates, setModalCandidates] = useState<any[]>([]);
  const [pendingChoice, setPendingChoice] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    if (preloadedData) {
      setDebate(preloadedData);
      setStats({ a: preloadedData.stats.a, b: preloadedData.stats.b });
      setUserVote(preloadedData.userVote);
    }
  }, [preloadedData]);

  // Loading & Empty States (Aynen kalsın)
  if (!debate && !preloadedData) return <div className="p-4 bg-white animate-pulse rounded-xl h-[200px]" />;
  if (!debate) return null;

  const total = stats.a + stats.b;
  const percentA = total === 0 ? 50 : Math.round((stats.a / total) * 100);
  const percentB = total === 0 ? 50 : 100 - percentA;

  // --- OY VERME MANTIĞI ---
  const handleVote = (choice: 'A' | 'B') => {
    if (userVote === choice) return;

    startTransition(async () => {
        // Optimistic Update
        const previousStats = { ...stats };
        const previousVote = userVote;
        
        // Ekranda anlık değişim yap
        setUserVote(choice);
        setStats(prev => ({
            a: choice === 'A' ? prev.a + 1 : (previousVote ? prev.a - 1 : prev.a),
            b: choice === 'B' ? prev.b + 1 : (previousVote ? prev.b - 1 : prev.b)
        }));

        const result = await voteDailyDebate(debate.id, choice);

        if (result.success) {
            toast({ title: "Oyunuz Kaydedildi", description: "Topluluk nabzına katkıda bulundunuz." });
            if (result.newStats) setStats(result.newStats);
        } 
        else if (result.requiresPersuasion) {
             // MODALI AÇ
             setModalCandidates(result.candidates || []);
             setPendingChoice(choice);
             setIsModalOpen(true);
             
             // UI'ı geri al (Modalda onaylarsa tekrar güncelleyeceğiz)
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
  const handlePersuasionConfirm = async (commentId: string) => {
      if (!pendingChoice) return;

      startTransition(async () => {
          const result = await confirmVoteChange(debate.id, pendingChoice, commentId);
          
          if (result.success) {
              setIsModalOpen(false);
              setUserVote(pendingChoice);
              if (result.newStats) setStats(result.newStats);
              toast({ title: "Fikir Değişikliği Onaylandı", description: "Esnek bir zihne sahip olduğun için tebrikler!" });
          } else {
              toast({ title: "Hata", description: result.error, variant: "destructive" });
          }
      });
  };

  return (
    <>
        <Card className="w-full bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm overflow-hidden relative">
            {/* ... CARD TASARIMI (Önceki kodun aynısı) ... */}
            {/* Header, Progress Bar, Butonlar buraya gelecek (Kod tekrarı olmasın diye kısalttım) */}
            
             <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Günün Tartışması</span>
                </div>
                <CardTitle className="text-base font-bold text-slate-800 leading-snug min-h-[3rem] line-clamp-3">
                    {debate.title}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 px-4 pb-4">
                 <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        <span className={cn("transition-colors", userVote === 'A' && "text-indigo-600")}>%{percentA} KATILIYORUM</span>
                        <span className={cn("transition-colors", userVote === 'B' && "text-rose-600")}>KATILMIYORUM %{percentB}</span>
                    </div>
                    <div className="h-1.5 flex w-full rounded-full overflow-hidden bg-slate-100">
                        <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${percentA}%` }} />
                        <div className="h-full bg-rose-500 transition-all duration-500 ease-out" style={{ width: `${percentB}%` }} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full text-xs h-8 font-bold border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all",
                            userVote === 'A' && "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:text-white"
                        )}
                        onClick={() => handleVote('A')}
                        disabled={isPending}
                    >
                        {isPending && userVote === 'A' ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null}
                        A: Katılıyorum
                    </Button>

                    <Button
                        variant="outline"
                        className={cn(
                            "w-full text-xs h-8 font-bold border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all",
                            userVote === 'B' && "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:text-white"
                        )}
                        onClick={() => handleVote('B')}
                        disabled={isPending}
                    >
                        {isPending && userVote === 'B' ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null}
                        B: Katılmıyorum
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* --- MODAL BURADA --- */}
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