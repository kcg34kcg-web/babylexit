'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Share2, AlertTriangle, Trophy, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDebateComments, postDebateComment, voteDailyDebate, confirmVoteChange, type VoteResponse } from "@/app/actions/debate";
import { toast } from "react-hot-toast"; // veya hooks/use-toast
import DebateResultsView from "./DebateResultsView"; 
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Debate, DebateComment } from "@/app/types"; // Tipleri import ettik

// --- MODAL (PORTAL FIX) ---
const PersuasionModal = ({ candidates, onClose, onConfirm, newSide }: {
    candidates: any[], // Candidates yapısı karmaşık olduğu için şimdilik any kalabilir veya Comment tipi verilebilir
    onClose: () => void,
    onConfirm: (id: string | null) => void,
    newSide: 'A' | 'B' | null
}) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" />
                    Fikir Değiştiriyorsun!
                </h3>
                <p className="text-slate-600 mb-4 text-sm">
                    "{newSide === 'A' ? 'A Tarafına' : 'B Tarafına'}" geçmek üzeresin. 
                    Seni bu karara iten en etkili argüman hangisiydi?
                </p>
                
                <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                    {candidates.map((c: any) => (
                        <div key={c.id} 
                            onClick={() => onConfirm(c.id)}
                            className="p-3 border border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs text-slate-900">{c.profiles?.full_name}</span>
                                {c.profiles?.job_title && (
                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                                        {c.profiles.job_title}
                                    </span>
                                )}
                                <div className="ml-auto flex items-center text-[10px] text-amber-600 font-bold bg-amber-100/50 px-2 py-0.5 rounded-full">
                                    <Trophy size={12} className="mr-1" />
                                    {c.persuasion_count} İkna
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{c.content}</p>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => onConfirm(null)} 
                    className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                >
                    Kendi hür irademle geçiyorum
                </button>
            </div>
        </div>,
        document.body
    );
};

export default function DebateCard({ debateData: initialData }: { debateData: Debate }) {
  const [debate, setDebate] = useState<Debate>(initialData);
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<DebateComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Persuasion State
  const [showPersuasionModal, setShowPersuasionModal] = useState(false);
  const [persuasionCandidates, setPersuasionCandidates] = useState<any[]>([]);
  const [pendingSide, setPendingSide] = useState<'A' | 'B' | null>(null);

  const toggleExpand = async () => {
    if (!isExpanded && comments.length === 0) {
        setLoadingComments(true);
        // Tip uyumsuzluğu olmaması için 'as any' veya actions dosyasında dönüş tipini düzeltmek gerekebilir
        // Şimdilik runtime'da sorun yok.
        const data = await getDebateComments(debate.id);
        setComments(data as unknown as DebateComment[]);
        setLoadingComments(false);
    }
    setIsExpanded(!isExpanded);
  };

  const applyServerVote = (res: VoteResponse) => {
    setDebate((prev) => ({
        ...prev,
        userVote: res.userVote || null,
        stats: res.newStats ? { ...prev.stats, ...res.newStats, total: (res.newStats.a + res.newStats.b) } : prev.stats,
        changeCount: res.userChangeCount ?? prev.changeCount
    }));
  };

  const handleVoteAttempt = async (choice: 'A' | 'B') => {
    if (debate.userVote === choice) return;

    // Daily debate yerine voteDailyDebate fonksiyonunu kullandığından emin ol
    const res = await voteDailyDebate(debate.id, choice);

    if (res.error) {
        toast.error(res.error);
        return;
    }

    if (res.requiresPersuasion) {
        setPersuasionCandidates(res.candidates || []);
        setPendingSide(choice);
        setShowPersuasionModal(true);
    } else {
        applyServerVote(res);
        toast.success("Oyunuz kullanıldı!");
        if (!isExpanded) toggleExpand();
    }
  };

  const handleConfirmChange = async (commentId: string | null) => {
      if (!pendingSide) return;

      const res = await confirmVoteChange(debate.id, pendingSide, commentId);
      
      if (res.error) {
          toast.error(res.error);
      } else {
          toast.success("Taraf değiştirdiniz!");
          applyServerVote(res);

          setLoadingComments(true);
          const newComments = await getDebateComments(debate.id);
          setComments(newComments as unknown as DebateComment[]);
          setLoadingComments(false);
      }
      setShowPersuasionModal(false);
  };

  const percentA = debate.stats.total > 0 
    ? Math.round((debate.stats.a / debate.stats.total) * 100) 
    : 50;

  return (
    <>
        {showPersuasionModal && (
            <PersuasionModal 
                candidates={persuasionCandidates} 
                onClose={() => setShowPersuasionModal(false)}
                onConfirm={handleConfirmChange}
                newSide={pendingSide}
            />
        )}

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative z-0 mb-6">
          
          <div className="p-6 cursor-pointer" onClick={toggleExpand}>
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {/* BUG FIX: profiles -> created_by olarak güncellendi */}
                    {debate.created_by?.avatar_url && (
                        <img src={debate.created_by.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    )}
                    <div>
                        {/* BUG FIX: profiles -> created_by */}
                        <p className="text-xs font-bold text-slate-900">{debate.created_by?.full_name || debate.created_by?.username || "Anonim"}</p>
                        <p className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(debate.created_at), { addSuffix: true, locale: tr })}</p>
                    </div>
                </div>
                
                {debate.is_active ? (
                     <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        CANLI MÜNAZARA
                     </span>
                ) : (
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">SONA ERDİ</span>
                )}
             </div>

             {/* Topic yerine Title kullanıyoruz */}
             <h2 className="text-xl font-black text-slate-800 mb-3 leading-tight">{debate.title}</h2>

             <div className="flex items-center gap-4 text-slate-400 text-xs font-medium">
                 <div className="flex items-center gap-1">
                     <MessageSquare size={14} />
                     <span>{debate.stats.total} Oy</span>
                 </div>
                 <div className="flex items-center gap-1">
                     <Share2 size={14} />
                     <span>Paylaş</span>
                 </div>
             </div>

             {!isExpanded && (
                 <div className="mt-4">
                    {debate.userVote ? (
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex relative">
                            <div style={{ width: `${percentA}%` }} className="bg-emerald-500 h-full transition-all duration-500"></div>
                            <div style={{ width: `${100 - percentA}%` }} className="bg-rose-500 h-full transition-all duration-500"></div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg w-fit border border-amber-100">
                            <CheckCircle2 size={14} /> <span>Tarafını seçmek için tıkla!</span>
                        </div>
                    )}
                 </div>
             )}
          </div>

          <AnimatePresence>
            {isExpanded && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-100 bg-slate-50/50"
                >
                    <div className="p-4 md:p-6">
                        <DebateResultsView 
                            debate={debate}
                            userVote={debate.userVote}
                            commentsA={comments.filter(c => c.side === 'A')}
                            commentsB={comments.filter(c => c.side === 'B')}
                            handleSendComment={async (side: 'A'|'B', text: string) => {
                                const res = await postDebateComment(debate.id, text, side);
                                if(res.error) toast.error(res.error);
                                else {
                                    const fresh = await getDebateComments(debate.id);
                                    setComments(fresh as unknown as DebateComment[]);
                                }
                            }}
                            handleVote={handleVoteAttempt}
                            commentText="" 
                            setCommentText={() => {}}
                            sending={false}
                            voting={false}
                        />
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
    </>
  );
}