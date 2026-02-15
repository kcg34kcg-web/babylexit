'use client';

import { useToast } from "@/hooks/use-toast"; // veya "@/components/ui/use-toast"
import { confirmVoteChange } from "@/app/actions/debate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { AlertCircle, ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
// BUG FIX #4: PersuasionButton artık import edildi
import PersuasionButton from "./PersuasionButton"; 

interface Comment {
  id: string;
  content: string;
  side: 'A' | 'B';
  persuasion_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
    job_title?: string;
  };
}

interface DebateCommentColumnProps {
  side: 'A' | 'B';
  comments: Comment[];
  debateId: string;
  userVote: 'A' | 'B' | null; // Kullanıcının mevcut tarafı
}

export default function DebateCommentColumn({ 
  side, 
  comments, 
  debateId, 
  userVote 
}: DebateCommentColumnProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [optimisticComments, setOptimisticComments] = useState(comments);

  // BUG FIX #16: Kullanıcı taraf değiştirmek istediğinde tetiklenir
  const handlePersuasion = async (commentId: string, commentSide: 'A' | 'B') => {
    if (!userVote) {
      toast({
        title: "Önce tarafını seçmelisin!",
        description: "İkna olmak için önce bir duruşun olmalı.",
        variant: "destructive",
      });
      return;
    }

    if (userVote === commentSide) {
      toast({
        title: "Zaten bu taraftasın!",
        description: "Kendi tarafındaki yorumlara sadece beğeni atabilirsin (yakında).",
      });
      return;
    }

    // Taraf değiştirme işlemi başlıyor
    startTransition(async () => {
      const result = await confirmVoteChange(debateId, commentSide, commentId);

      if (result.success) {
        toast({
          title: "Fikir Değişikliği Onaylandı!",
          description: `Bu yorum seni "${commentSide}" tarafına ikna etti.`,
          variant: "default", // Success
        });
        // Optimistic UI update (Basitçe sayfayı yenilemeden sayıyı artırabiliriz)
        // Gerçek veri revalidatePath ile gelecek.
      } else {
        toast({
          title: "Hata",
          description: result.error || "Bir sorun oluştu.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className={cn(
        "text-lg font-bold sticky top-0 bg-background/95 backdrop-blur z-10 py-2 border-b",
        side === 'A' ? "text-blue-600 border-blue-100" : "text-red-600 border-red-100"
      )}>
        {side === 'A' ? "Mavi Taraf Görüşleri" : "Kırmızı Taraf Görüşleri"}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({comments.length})</span>
      </h3>

      {comments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
          <p>Henüz bu tarafta bir savunma yok.</p>
          <p className="text-sm">İlk yorumu sen yaz!</p>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          {comments.map((comment) => (
            <div 
              key={comment.id} 
              className={cn(
                "group relative p-4 rounded-xl border transition-all hover:shadow-md",
                side === 'A' ? "bg-blue-50/30 border-blue-100" : "bg-red-50/30 border-red-100",
                // İkna eden yorum vurgusu
                comment.persuasion_count > 0 && "ring-1 ring-offset-2", 
                side === 'A' ? "ring-blue-200" : "ring-red-200"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border">
                    <AvatarImage src={comment.profiles?.avatar_url || ""} />
                    <AvatarFallback>{comment.profiles?.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {comment.profiles?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comment.profiles?.job_title || "Üye"} • {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: tr })}
                    </p>
                  </div>
                </div>
                
                {/* İkna Sayacı Badge */}
                {comment.persuasion_count > 0 && (
                  <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200" title="Bu yorum kaç kişiyi taraf değiştirmeye ikna etti?">
                    <AlertCircle className="w-3 h-3" />
                    {comment.persuasion_count} İkna
                  </div>
                )}
              </div>

              {/* Content */}
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>

              {/* Footer / Actions */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-dashed border-gray-200/50">
                <div className="flex gap-2">
                    {/* Standart Beğeni (Opsiyonel) */}
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="w-3 h-3 mr-1" /> Beğen
                    </Button>
                </div>

                {/* BUG FIX #4: PersuasionButton Eklendi */}
                {/* Eğer kullanıcı karşı taraftaysa (veya tarafsızsa) ikna butonu görünür */}
                {userVote !== side && (
                    <PersuasionButton 
                        commentId={comment.id}
                        side={side}
                        isPending={isPending}
                        onPersuade={() => handlePersuasion(comment.id, side)}
                    />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}