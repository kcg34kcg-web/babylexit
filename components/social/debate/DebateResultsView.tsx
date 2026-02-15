'use client';

import { postDebateComment } from "@/app/actions/debate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";
import { Loader2, Send, ShieldAlert } from "lucide-react";
import { useState, useTransition } from "react";
import DebateCommentColumn from "./DebateCommentColumn";

// Tip Tanımları (Local)
interface DebateResultsViewProps {
  debate: {
    id: string;
    title: string;
    stats: { a: number; b: number; total: number };
    userVote: 'A' | 'B' | null;
  };
  comments: any[]; // Detaylı tip CommentColumn içinde
  currentUser: any;
}

export default function DebateResultsView({ debate, comments, currentUser }: DebateResultsViewProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  
  // Mobil görünüm için Tab state'i
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  // Yorumları taraflara ayır
  const commentsA = comments.filter(c => c.side === 'A');
  const commentsB = comments.filter(c => c.side === 'B');

  // İstatistik Hesaplama (BUG 5 Fix: NaN koruması)
  const totalVotes = (debate.stats.a || 0) + (debate.stats.b || 0);
  const percentA = totalVotes === 0 ? 50 : Math.round(((debate.stats.a || 0) / totalVotes) * 100);
  const percentB = totalVotes === 0 ? 50 : 100 - percentA;

  const handlePostComment = async () => {
    if (!content.trim()) return;

    if (!debate.userVote) {
      toast({
        title: "Önce Tarafını Seç!",
        description: "Yorum yapabilmek için önce oy kullanmalısın.",
        variant: "destructive"
      });
      return;
    }

    startTransition(async () => {
      // Kullanıcı hangi taraftaysa yorum o tarafa gider
      // (Backend artık taraf değiştirme niyetinde karşı tarafa yazmaya izin veriyor ama
      // burada varsayılan olarak kendi tarafını gönderiyoruz)
      const result = await postDebateComment(debate.id, content, debate.userVote!);

      if (result.success) {
        toast({ title: "Yorum Gönderildi", description: "Fikrin arenaya eklendi." });
        setContent("");
      } else {
        toast({ title: "Hata", description: result.error || "Yorum gönderilemedi.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      
      {/* 1. İstatistik Barı (Header) */}
      <div className="p-4 bg-background/50 backdrop-blur-sm sticky top-14 z-20 border-b">
        <div className="flex justify-between text-sm font-bold mb-2">
          <span className="text-blue-600">% {percentA} Mavi Taraf</span>
          <span className="text-muted-foreground text-xs self-center">{totalVotes} Oy</span>
          <span className="text-red-600">Kırmızı Taraf % {percentB}</span>
        </div>
        <div className="h-4 w-full flex rounded-full overflow-hidden bg-gray-200">
           <div 
             className="h-full bg-blue-500 transition-all duration-500" 
             style={{ width: `${percentA}%` }} 
           />
           <div 
             className="h-full bg-red-500 transition-all duration-500" 
             style={{ width: `${percentB}%` }} 
           />
        </div>
        
        {/* Kullanıcının Durumu */}
        <div className="mt-2 text-center">
            {debate.userVote ? (
                <span className={cn(
                    "text-xs px-2 py-1 rounded-full border",
                    debate.userVote === 'A' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-700 border-red-200"
                )}>
                    Sen <b>{debate.userVote === 'A' ? "Mavi" : "Kırmızı"}</b> tarafı savunuyorsun.
                </span>
            ) : (
                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Henüz oy vermedin. Yorumlar "tarafsız" görünür.
                </span>
            )}
        </div>
      </div>

      {/* 2. Yorum Alanı (Scrollable) */}
      <div className="flex-1 overflow-hidden">
        {/* Mobil: Tab Yapısı */}
        <div className="md:hidden h-full flex flex-col">
            <Tabs defaultValue="A" value={activeTab} onValueChange={(v) => setActiveTab(v as 'A'|'B')} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="A" className="data-[state=active]:text-blue-600">Mavi Görüşler</TabsTrigger>
                    <TabsTrigger value="B" className="data-[state=active]:text-red-600">Kırmızı Görüşler</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-y-auto p-4">
                    <TabsContent value="A" className="mt-0">
                        <DebateCommentColumn 
                            side="A" 
                            comments={commentsA} 
                            debateId={debate.id} 
                            userVote={debate.userVote} 
                        />
                    </TabsContent>
                    <TabsContent value="B" className="mt-0">
                        <DebateCommentColumn 
                            side="B" 
                            comments={commentsB} 
                            debateId={debate.id} 
                            userVote={debate.userVote} 
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>

        {/* Desktop: Split Yapı */}
        <div className="hidden md:grid md:grid-cols-2 h-full divide-x">
            <div className="overflow-y-auto p-4 h-[calc(100vh-300px)]">
                <DebateCommentColumn side="A" comments={commentsA} debateId={debate.id} userVote={debate.userVote} />
            </div>
            <div className="overflow-y-auto p-4 h-[calc(100vh-300px)]">
                <DebateCommentColumn side="B" comments={commentsB} debateId={debate.id} userVote={debate.userVote} />
            </div>
        </div>
      </div>

      {/* 3. Yorum Yazma Formu (Footer - Sticky) */}
      {/* BUG FIX #8: Fixed yerine sticky/relative kullanımı ve safe-area handling */}
      <div className="bg-background border-t p-4 z-20 sticky bottom-0 w-full">
        <div className="max-w-4xl mx-auto flex gap-3 items-start">
            <Avatar className="w-8 h-8 hidden sm:block">
                <AvatarImage src={currentUser?.avatar_url} />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 relative">
                {/* BUG FIX #6: Disabled kontrolü kalktı, yerine görsel ipucu */}
                <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={debate.userVote 
                        ? `${debate.userVote === 'A' ? 'Mavi' : 'Kırmızı'} taraf adına bir argüman sun...`
                        : "Önce yukarıdan bir taraf seç, sonra fikrini yaz..."
                    }
                    className="min-h-[50px] max-h-[120px] resize-none pr-12 bg-muted/30 focus:bg-background transition-colors"
                />
                <Button 
                    size="icon" 
                    className={cn(
                        "absolute right-2 bottom-2 h-8 w-8",
                        debate.userVote === 'A' ? "bg-blue-600 hover:bg-blue-700" : 
                        debate.userVote === 'B' ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"
                    )}
                    disabled={isPending || !content.trim()}
                    onClick={handlePostComment}
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
        </div>
      </div>

    </div>
  );
}