'use client';

import { Sparkles, ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import DebateCommentColumn from "./DebateCommentColumn";

interface Props {
  debate: any;
  userVote: 'A' | 'B' | null;
  commentsA: any[];
  commentsB: any[];
  handleSendComment: (side: 'A' | 'B', text: string) => Promise<void>;
  handleVote: (choice: 'A' | 'B') => Promise<void>; // Oy verme fonksiyonunu ekledik
  commentText: string;
  setCommentText: (t: string) => void;
  sending: boolean;
  voting: boolean;
}

export default function DebateResultsView({
  debate, userVote, commentsA, commentsB, handleSendComment, handleVote, commentText, setCommentText, sending, voting
}: Props) {

  const stats = debate.stats || { a: 0, b: 0, total: 0 };
  const percentA = stats.total > 0 ? Math.round((stats.a / stats.total) * 100) : 50;
  
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ÜST KISIM: İSTATİSTİK VE OYLAMA KARTI */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-slate-200 to-rose-500"></div>
        
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 tracking-tight text-center">
          {debate.topic}
        </h2>

        {/* AI Özeti */}
        {debate.ai_summary && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8 flex gap-3">
             <div className="bg-purple-100 p-2 rounded-lg h-fit shrink-0">
                <Sparkles size={18} className="text-purple-600" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-purple-600 mb-1 uppercase tracking-wide">AI Analizi</p>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  {debate.ai_summary}
                </p>
             </div>
          </div>
        )}

        {/* --- DİNAMİK ALAN: OY VERİLDİ Mİ? --- */}
        {!userVote ? (
            // A) OY VERMEDİYSE: BUTONLARI GÖSTER (Eski tasarımın içine buton gömdük)
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-6">
                <button 
                   onClick={() => handleVote('A')}
                   disabled={voting}
                   className="group relative w-full md:w-1/2 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-500 text-emerald-800 p-4 rounded-xl transition-all flex items-center justify-center gap-3 font-bold"
                >
                   {voting ? <span className="animate-spin">⌛</span> : <ThumbsUp size={20} className="group-hover:scale-110 transition-transform" />}
                   <span>{debate.option_a}</span>
                </button>

                <div className="text-slate-300 font-bold text-xs uppercase tracking-widest">VS</div>

                <button 
                   onClick={() => handleVote('B')}
                   disabled={voting}
                   className="group relative w-full md:w-1/2 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 hover:border-rose-500 text-rose-800 p-4 rounded-xl transition-all flex items-center justify-center gap-3 font-bold"
                >
                   {voting ? <span className="animate-spin">⌛</span> : <ThumbsDown size={20} className="group-hover:scale-110 transition-transform" />}
                   <span>{debate.option_b}</span>
                </button>
            </div>
        ) : (
            // B) OY VERDİYSE: BARLARI GÖSTER
            <div className="animate-in zoom-in-95 duration-300">
               <div className="flex justify-between text-sm font-bold mb-2 px-2">
                  <span className={`flex flex-col md:flex-row md:gap-2 ${userVote === 'A' ? 'text-emerald-700' : 'text-slate-500 opacity-70'}`}>
                    <span className="flex items-center gap-1">
                        {userVote === 'A' && <CheckCircle2 size={14} />} {debate.option_a}
                    </span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 rounded-md">%{percentA}</span>
                  </span>
                  <span className={`flex flex-col md:flex-row md:gap-2 text-right md:text-left items-end md:items-start ${userVote === 'B' ? 'text-rose-700' : 'text-slate-500 opacity-70'}`}>
                    <span className="text-rose-600 bg-rose-50 px-2 rounded-md">%{100 - percentA}</span>
                    <span className="flex items-center gap-1">
                        {debate.option_b} {userVote === 'B' && <CheckCircle2 size={14} />}
                    </span>
                  </span>
               </div>
               
               <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div style={{ width: `${percentA}%` }} className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-1000 ease-out relative group">
                    <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:animate-shimmer"></div>
                  </div>
                  <div style={{ width: `${100 - percentA}%` }} className="bg-gradient-to-r from-rose-400 to-rose-500 h-full transition-all duration-1000 ease-out relative group">
                    <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:animate-shimmer"></div>
                  </div>
               </div>
               
               <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">Toplam {stats.total} oy kullanıldı</p>
            </div>
        )}

      </div>

      {/* ALT KISIM: YORUM ARENASI (Split Screen) - ARTIK HEP GÖRÜNÜR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        
        {/* Sol Kolon (A) */}
        <DebateCommentColumn 
          side="A"
          title={debate.option_a}
          count={stats.a}
          comments={commentsA}
          onSend={() => handleSendComment('A', commentText)}
          inputText={commentText}
          setInputText={setCommentText}
          isSending={sending}
        />

        {/* Sağ Kolon (B) */}
        <DebateCommentColumn 
          side="B"
          title={debate.option_b}
          count={stats.b}
          comments={commentsB}
          onSend={() => handleSendComment('B', commentText)}
          inputText={commentText}
          setInputText={setCommentText}
          isSending={sending}
        />

      </div>
    </div>
  );
}