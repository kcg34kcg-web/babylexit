'use client';

import { useState, useEffect, useTransition } from "react";
import { Send, Lock, Loader2, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

// Actions & Components
import { getDebateComments, postDebateComment } from "@/app/actions/debate";
import PersuasionButton from "./PersuasionButton";

interface Props {
  debateId: string;
  userVote: 'A' | 'B' | null;
  isOpen: boolean;
}

export default function DebateCommentColumn({ debateId, userVote, isOpen }: Props) {
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Yorum Yazma State
  const [content, setContent] = useState("");
  const [isPosting, startPosting] = useTransition();

  // Açıldığında yorumları çek
  useEffect(() => {
    if (isOpen && comments.length === 0) {
        setLoading(true);
        getDebateComments(debateId)
            .then(data => setComments(data || []))
            .finally(() => setLoading(false));
    }
  }, [isOpen, debateId]);

  // Yorum Gönderme
  const handlePost = () => {
      if (!content.trim() || !userVote) return;

      startPosting(async () => {
          const result = await postDebateComment(debateId, content, userVote);
          
          if (result.success) {
              toast({ title: "Yorum Gönderildi", description: "Fikrin arenaya eklendi." });
              setContent("");
              // Listeyi yenile
              const newData = await getDebateComments(debateId);
              setComments(newData || []);
          } else {
              toast({ title: "Hata", description: result.error, variant: "destructive" });
          }
      });
  };

  if (!isOpen) return null;

  return (
    <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in slide-in-from-top-2">
       
       {/* YORUM YAZMA ALANI */}
       <div className="mb-6 flex gap-3">
          <div className="flex-1 relative">
             <Textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!userVote || isPosting}
                placeholder={userVote ? "Argümanlarını sun..." : "Yorum yapmak için önce oy ver."}
                className={cn(
                    "min-h-[80px] text-sm resize-none bg-white",
                    !userVote && "opacity-50 cursor-not-allowed bg-slate-100"
                )}
             />
             
             {!userVote && (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2 pointer-events-none">
                     <Lock size={16} />
                     <span className="text-xs font-bold">Taraf Seçmelisin</span>
                 </div>
             )}
          </div>
          
          <Button 
            onClick={handlePost}
            disabled={!content.trim() || !userVote || isPosting}
            className="h-[80px] w-[60px] bg-slate-900 hover:bg-slate-800"
          >
             {isPosting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
          </Button>
       </div>

       {/* YORUM LİSTESİ */}
       {loading ? (
           <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
       ) : comments.length === 0 ? (
           <div className="text-center py-6 text-slate-400">
               <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
               <p className="text-xs">Henüz yorum yok. İlk sen ol!</p>
           </div>
       ) : (
           <div className="space-y-4">
               {comments.map((comment) => (
                   <div key={comment.id} className="flex gap-3 group">
                       <Avatar className="w-8 h-8 mt-1 border border-white shadow-sm">
                           <AvatarImage src={comment.profiles?.avatar_url} />
                           <AvatarFallback>U</AvatarFallback>
                       </Avatar>
                       
                       <div className="flex-1">
                           <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm relative">
                               {/* Taraf Rozeti */}
                               <span className={cn(
                                   "absolute top-3 right-3 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                                   comment.side === 'A' ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"
                               )}>
                                   {comment.side} Tarafı
                               </span>

                               <div className="flex items-center gap-2 mb-1">
                                   <span className="text-xs font-bold text-slate-800">
                                       {comment.profiles?.full_name || "Gizli Üye"}
                                   </span>
                                   <span className="text-[10px] text-slate-400">
                                       {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: tr })}
                                   </span>
                               </div>
                               
                               <p className="text-sm text-slate-700 leading-relaxed">
                                   {comment.content}
                               </p>
                           </div>

                           <div className="flex items-center gap-4 mt-1 ml-2">
                               <PersuasionButton 
                                   debateId={debateId}
                                   commentId={comment.id}
                                   authorId={comment.profiles?.id}
                                   initialCount={comment.persuasion_count || 0}
                                   userSide={userVote}
                                   commentSide={comment.side} // Yorumun tarafı
                               />
                               {/* Yanıtla butonu eklenebilir */}
                           </div>
                       </div>
                   </div>
               ))}
           </div>
       )}
    </div>
  );
}