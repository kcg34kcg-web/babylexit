'use client';

import { useState } from "react";
import { MessageSquare, Share2, MoreHorizontal, ChevronDown, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDebateComments, postDebateComment, voteDebate } from "@/app/actions/debate";
import { toast } from "react-hot-toast";
import DebateResultsView from "./DebateResultsView"; // Mevcut tasarım bileşenin
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  debateData: any; // Veritabanından gelen ham veri
}

export default function DebateCard({ debateData: initialData }: Props) {
  const [debate, setDebate] = useState(initialData);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Detay verileri (Yorumlar) sadece expand olunca yüklenir
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Interaction State'leri
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [voting, setVoting] = useState(false);

  // --- ACTIONS ---

  // 1. Kartı Aç/Kapa ve Yorumları Yükle (Lazy Load)
  const toggleExpand = async () => {
    if (!isExpanded && comments.length === 0) {
        setLoadingComments(true);
        const data = await getDebateComments(debate.id);
        setComments(data);
        setLoadingComments(false);
    }
    setIsExpanded(!isExpanded);
  };

  // Yorumları manuel yenilemek için (Oylama sonrası vb.)
  const refreshComments = async () => {
      const data = await getDebateComments(debate.id);
      setComments(data);
  };

  // 2. Oy Verme
  const handleVote = async (choice: 'A' | 'B') => {
    if (voting || debate.userVote) return; // Zaten oy verdiyse engelle
    setVoting(true);

    const res = await voteDebate(debate.id, choice);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Oyunuz kaydedildi!");
      // Optimistic Update: Arayüzü hemen güncelle
      setDebate((prev: any) => ({
          ...prev,
          userVote: choice,
          stats: {
              ...prev.stats,
              [choice.toLowerCase()]: prev.stats[choice.toLowerCase()] + 1,
              total: prev.stats.total + 1
          }
      }));
      // Otomatik olarak detayları aç
      if (!isExpanded) toggleExpand();
    }
    setVoting(false);
  };

  // 3. Yorum Gönderme
  const handleSendComment = async (side: 'A' | 'B', text: string) => {
    if (!text.trim()) return;
    
    if (!debate.userVote) {
       toast.error("Yorum yapmak için önce tarafını seçmelisin!");
       return;
    }

    setSending(true);
    const res = await postDebateComment(debate.id, text, side);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Görüşünüz paylaşıldı!");
      setCommentText("");
      await refreshComments();
    }
    setSending(false);
  };

  // --- RENDER ---
  const stats = debate.stats || { a: 0, b: 0, total: 0 };
  const percentA = stats.total > 0 ? Math.round((stats.a / stats.total) * 100) : 50;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      
      {/* 1. ÜST KISIM (VİTRİN) - HER ZAMAN GÖRÜNÜR */}
      <div className="p-6 cursor-pointer" onClick={toggleExpand}>
         {/* Yazar Bilgisi */}
         <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  {debate.profiles?.avatar_url && (
                      <img src={debate.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  )}
               </div>
               <div>
                  <p className="font-bold text-sm text-slate-900">{debate.profiles?.full_name || 'Anonim'}</p>
                  <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(debate.created_at), { addSuffix: true, locale: tr })}</p>
               </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
         </div>

         {/* Başlık */}
         <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-3 leading-tight group-hover:text-amber-600 transition-colors">
            {debate.topic}
         </h2>

         {/* İstatistik Bar (Mini) - Sadece Vitrin Modunda */}
         {!isExpanded && (
             <div className="mt-4 animate-in fade-in">
                {debate.userVote ? (
                    // Oy Verdiyse: Mini Bar
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div style={{ width: `${percentA}%` }} className="bg-emerald-500 h-full"></div>
                        <div style={{ width: `${100 - percentA}%` }} className="bg-rose-500 h-full"></div>
                    </div>
                ) : (
                    // Oy Vermediyse: Harekete Geçirici Mesaj
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg w-fit">
                        <CheckCircle2 size={14} />
                        <span>Oy kullan ve tartışmaya katıl!</span>
                    </div>
                )}
             </div>
         )}
         
         {/* Alt Etkileşim Butonları */}
         <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100">
            <button className={`flex items-center gap-2 text-sm font-bold transition-colors ${isExpanded ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}>
                <MessageSquare size={18} />
                <span>{isExpanded ? 'Tartışmayı Gizle' : 'Tartışmaya Katıl'}</span>
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                <Share2 size={18} />
                <span>Paylaş</span>
            </button>
            {isExpanded && loadingComments && <span className="text-xs text-slate-400 animate-pulse ml-auto">Yükleniyor...</span>}
            <ChevronDown size={20} className={`ml-auto text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
         </div>
      </div>

      {/* 2. ALT KISIM (SAHNE) - SADECE AÇILINCA GÖRÜNÜR */}
      <AnimatePresence>
        {isExpanded && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-slate-100 bg-slate-50/50"
            >
                <div className="p-4 md:p-6">
                    {/* MEVCUT TASARIMI BURADA KULLANIYORUZ */}
                    <DebateResultsView 
                        debate={debate}
                        userVote={debate.userVote}
                        commentsA={comments.filter(c => c.side === 'A')}
                        commentsB={comments.filter(c => c.side === 'B')}
                        handleSendComment={handleSendComment}
                        handleVote={handleVote}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        sending={sending}
                        voting={voting}
                        // Bu prop'u ResultsView'a eklememiz gerekebilir veya prop drilling yapabiliriz
                        // Şimdilik ResultsView'ı güncellememize gerek yok çünkü CommentColumn içinde refresh'i handle ettik
                    />
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}