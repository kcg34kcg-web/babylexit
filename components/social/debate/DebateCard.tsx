'use client';

import { useState } from "react";
import { MessageSquare, Share2, MoreHorizontal, ChevronDown, CheckCircle2, AlertTriangle, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDebateComments, postDebateComment, voteDebate, confirmVoteChange } from "@/app/actions/debate";
import { toast } from "react-hot-toast";
import DebateResultsView from "./DebateResultsView"; 
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

// Basit bir Portal/Modal Bileşeni (Bug 1 Çözümü)
const PersuasionModal = ({ candidates, onClose, onConfirm, newSide }: any) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" />
                Fikir Değiştiriyorsun!
            </h3>
            <p className="text-slate-600 mb-4 text-sm">
                "{newSide === 'A' ? 'A Tarafına' : 'B Tarafına'}" geçmek üzeresin. 
                Seni bu karara iten en etkili argüman hangisiydi? (Seçersen yazar puan kazanır)
            </p>
            
            <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-4">
                {candidates.map((c: any) => (
                    <div key={c.id} 
                        onClick={() => onConfirm(c.id)}
                        className="p-3 border border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 cursor-pointer transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-xs">{c.profiles?.full_name}</span>
                            {c.profiles?.job_title && (
                                <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">
                                    {c.profiles.job_title}
                                </span>
                            )}
                            <div className="ml-auto flex items-center text-[10px] text-amber-600 font-bold">
                                <Trophy size={12} className="mr-1" />
                                {c.persuasion_count} İkna
                            </div>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">{c.content}</p>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => onConfirm(null)} // Kimse ikna etmedi
                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
                Kendi hür irademle geçiyorum
            </button>
        </div>
    </div>
);

export default function DebateCard({ debateData: initialData }: { debateData: any }) {
  const [debate, setDebate] = useState(initialData);
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Persuasion State
  const [showPersuasionModal, setShowPersuasionModal] = useState(false);
  const [persuasionCandidates, setPersuasionCandidates] = useState<any[]>([]);
  const [pendingSide, setPendingSide] = useState<'A' | 'B' | null>(null);

  const toggleExpand = async () => {
    if (!isExpanded && comments.length === 0) {
        setLoadingComments(true);
        const data = await getDebateComments(debate.id);
        setComments(data);
        setLoadingComments(false);
    }
    setIsExpanded(!isExpanded);
  };

  const handleVoteAttempt = async (choice: 'A' | 'B') => {
    // 1. Zaten aynı taraftaysa işlem yapma
    if (debate.userVote === choice) return;

    // 2. Server'a sor: "Bu adam oy verebilir mi, değiştirebilir mi?"
    const res = await voteDebate(debate.id, choice);

    if (res.error) {
        toast.error(res.error);
        return;
    }

    // 3. Eğer taraf değiştiriyorsa Modal aç (Bug 3 ve 6 Kontrolü)
    if (res.requiresPersuasion) {
        setPersuasionCandidates(res.candidates || []);
        setPendingSide(choice);
        setShowPersuasionModal(true);
    } else {
        // 4. İlk defa oy veriyorsa direkt güncelle
        updateLocalVote(choice);
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
          toast.success("Taraf değiştirdiniz! (Eski yorumlarınız silindi)");
          updateLocalVote(pendingSide);
          // Yorumları tazelememiz lazım çünkü eskiler silindi
          const newComments = await getDebateComments(debate.id);
          setComments(newComments);
      }
      setShowPersuasionModal(false);
  };

  // Bug 7 Çözümü: İstatistikleri güvenli güncelle
  const updateLocalVote = (choice: 'A' | 'B') => {
      setDebate((prev: any) => {
          const isChange = prev.userVote !== null;
          const oldChoice = prev.userVote as 'A' | 'B';
          
          let newStats = { ...prev.stats };
          
          if (isChange) {
              newStats[oldChoice.toLowerCase()]--;
              newStats[choice.toLowerCase()]++;
          } else {
              newStats[choice.toLowerCase()]++;
              newStats.total++;
          }

          return {
              ...prev,
              userVote: choice,
              stats: newStats,
              changeCount: isChange ? (prev.changeCount || 0) + 1 : prev.changeCount
          };
      });
  };

  const percentA = debate.stats.total > 0 ? Math.round((debate.stats.a / debate.stats.total) * 100) : 50;

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

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 relative z-0">
          {/* ... (Header kısmı aynı kalabilir) ... */}
          
          <div className="p-6 cursor-pointer" onClick={toggleExpand}>
             {/* ... Header Kodları ... */}
             <h2 className="text-xl font-black text-slate-800 mb-3">{debate.topic}</h2>

             {/* Stat Bar Update */}
             {!isExpanded && (
                 <div className="mt-4">
                    {debate.userVote ? (
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                            <div style={{ width: `${percentA}%` }} className="bg-emerald-500 h-full"></div>
                            <div style={{ width: `${100 - percentA}%` }} className="bg-rose-500 h-full"></div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg w-fit">
                            <CheckCircle2 size={14} /> <span>Katılmak için tıkla!</span>
                        </div>
                    )}
                 </div>
             )}
             
             {/* ... Footer Butonları ... */}
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
                            // sendComment mantığı action ile güncellediğimiz için aynı kalabilir
                            handleSendComment={async (side, text) => {
                                await postDebateComment(debate.id, text, side);
                                const fresh = await getDebateComments(debate.id);
                                setComments(fresh);
                            }}
                            handleVote={handleVoteAttempt} // ÖNEMLİ: Yeni vote fonksiyonu
                            commentText="" // Yönetimi ResultsView içinde de yapabilirsin
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