'use client';

import { voteDailyDebate } from "@/app/actions/debate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";
import { Loader2, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";

// Mock Data (Backend'den gelmeli ama widget olduğu için şimdilik sabit)
// Gerçek uygulamada bu props olarak gelmeli.
const DAILY_TOPIC = {
    id: "daily-fix-01",
    question: "Sosyal Medya 16 yaş altına yasaklanmalı mı?",
    optionA: "Evet, Yasaklanmalı",
    optionB: "Hayır, Eğitim Verilmeli",
    initialStats: { a: 120, b: 85 }
};

export default function DailyDebateWidget() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  // Local State (Optimistic Update için)
  const [stats, setStats] = useState(DAILY_TOPIC.initialStats);
  const [userVote, setUserVote] = useState<'A' | 'B' | null>(null);

  // BUG FIX #5: Matematiksel hesaplama hatası giderildi (NaN check)
  const total = stats.a + stats.b;
  const percentA = total === 0 ? 50 : Math.round((stats.a / total) * 100);
  const percentB = total === 0 ? 50 : 100 - percentA;

  const handleVote = (choice: 'A' | 'B') => {
    if (userVote === choice) return; // Zaten seçili

    startTransition(async () => {
        // Optimistic UI Update
        setUserVote(choice);
        setStats(prev => ({
            ...prev,
            [choice.toLowerCase()]: prev[choice.toLowerCase() as 'a'|'b'] + 1,
            // Eğer taraf değiştiriyorsa eskisini azaltmak gerekir ama basitlik için sadece artırıyoruz
        }));

        // BUG FIX #1: Server Action Call
        const result = await voteDailyDebate(DAILY_TOPIC.id, choice);

        if (result.success) {
            toast({ title: "Oy Verildi", description: "Günlük ankete katıldın." });
            // Backend'den güncel veri döndüyse onu set et
            if (result.newStats) {
                setStats(result.newStats);
            }
        } else if (result.requiresPersuasion) {
             toast({ 
                 title: "Dikkat!", 
                 description: "Taraf değiştirmek için ikna olmalısın. (Detaylı modül ana sayfada)",
                 variant: "warning" 
             });
             // Rollback
             setUserVote(null); 
        } else {
             toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    });
  };

  return (
    <Card className="w-full bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Günün Tartışması</span>
        </div>
        <CardTitle className="text-lg font-bold text-foreground leading-tight">
            {DAILY_TOPIC.question}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span className={cn(userVote === 'A' && "text-blue-600 font-bold")}>
                    % {percentA} {DAILY_TOPIC.optionA}
                </span>
                <span className={cn(userVote === 'B' && "text-red-600 font-bold")}>
                    {DAILY_TOPIC.optionB} % {percentB}
                </span>
            </div>
            <div className="h-2 flex w-full rounded-full overflow-hidden bg-gray-100">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${percentA}%` }} />
                <div className="h-full bg-red-500 transition-all" style={{ width: `${percentB}%` }} />
            </div>
        </div>

        {/* Butonlar */}
        <div className="grid grid-cols-2 gap-3">
            <Button
                variant={userVote === 'A' ? "default" : "outline"}
                className={cn(
                    "w-full text-xs h-9",
                    userVote === 'A' ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                )}
                onClick={() => handleVote('A')}
                disabled={isPending}
            >
                {isPending && userVote === 'A' ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null}
                {userVote === 'A' ? "Seçildi" : "Katılıyorum"}
            </Button>

            <Button
                variant={userVote === 'B' ? "default" : "outline"}
                className={cn(
                    "w-full text-xs h-9",
                    userVote === 'B' ? "bg-red-600 hover:bg-red-700" : "hover:bg-red-50 hover:text-red-700 border-red-200"
                )}
                onClick={() => handleVote('B')}
                disabled={isPending}
            >
                {isPending && userVote === 'B' ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : null}
                {userVote === 'B' ? "Seçildi" : "Katılmıyorum"}
            </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
            {total} kişi oy kullandı • Her gece 00:00'da yenilenir
        </p>
      </CardContent>
    </Card>
  );
}