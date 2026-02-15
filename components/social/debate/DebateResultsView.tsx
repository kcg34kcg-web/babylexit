'use client';

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Sparkles, Send, Briefcase, GraduationCap, RefreshCcw, CheckCircle2, BarChart2 } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  debate: any;
  userVote: 'A' | 'B' | null;
  commentsA: any[];
  commentsB: any[];
  handleSendComment: (side: 'A' | 'B', text: string) => void;
  handleVote: (choice: 'A' | 'B') => void;
  commentText: string;
  setCommentText: (text: string) => void;
  sending: boolean;
  voting: boolean;
}

export default function DebateResultsView({ 
    debate, userVote, commentsA, commentsB, 
    handleSendComment, handleVote, 
    commentText, setCommentText, sending, voting 
}: Props) {

  const [showDemographics, setShowDemographics] = useState(false); // Varsayılan: GİZLİ

  const stats = debate.stats || { a: 0, b: 0, total: 0, lawyers: { exists: false, percentA: 0 }, students: { exists: false, percentA: 0 } };
  const percentA = stats.total > 0 ? Math.round((stats.a / stats.total) * 100) : 50;

  const renderCommentList = (list: any[], side: 'A' | 'B') => (
      <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-1">
          {list.length === 0 && <div className="text-center py-8 text-slate-400 text-xs italic">Bu taraf sessiz... İlk yorumu sen yaz!</div>}
          {list.map((c) => (
            <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-100 text-xs shadow-sm">
               <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{c.profiles?.full_name}</span>
                    {c.profiles?.job_title && <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{c.profiles.job_title}</span>}
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}</span>
               </div>
               <p className="text-slate-700 leading-relaxed">{c.content}</p>
            </div>
          ))}
      </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* 1. İstatistik ve Özet Alanı */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-slate-200 to-rose-500"></div>
        
        <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2 mt-2">{debate.topic}</h2>
        
        {debate.ai_summary && (
          <div className="flex gap-3 bg-indigo-50 p-4 rounded-xl mb-6 border border-indigo-100">
             <Sparkles size={18} className="text-indigo-600 shrink-0 mt-1" />
             <p className="text-xs text-indigo-900 leading-relaxed font-medium">{debate.ai_summary}</p>
          </div>
        )}

        {/* GENEL SONUÇ ÇUBUĞU */}
        <div className="mb-4">
           <div className="flex justify-between text-sm font-bold mb-2">
              <span className={`flex items-center gap-2 ${userVote === 'A' ? 'text-emerald-600 underline decoration-2 underline-offset-4' : 'text-slate-500'}`}>
                 %{percentA} {debate.option_a}
              </span>
              <span className={`flex items-center gap-2 ${userVote === 'B' ? 'text-rose-600 underline decoration-2 underline-offset-4' : 'text-slate-500'}`}>
                 {debate.option_b} %{100 - percentA}
              </span>
           </div>
           
           <div className="relative w-full h-6 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${percentA}%` }} className="bg-emerald-500 h-full transition-all duration-1000 ease-out relative group">
                 <div className="absolute inset-0 flex items-center justify-start pl-3 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {stats.a} Oy
                 </div>
              </div>
              <div style={{ width: `${100 - percentA}%` }} className="bg-rose-500 h-full transition-all duration-1000 ease-out relative group">
                 <div className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {stats.b} Oy
                 </div>
              </div>
           </div>
           
           <div className="text-center text-[10px] text-slate-400 mt-2 font-medium flex justify-center gap-4">
              <span>Toplam {stats.total} Oy</span>
              {userVote && <span className="text-amber-600 font-bold">Senin Tercihin: {userVote === 'A' ? debate.option_a : debate.option_b}</span>}
           </div>
        </div>

        {/* --- DÜZELTME: GİZLE/GÖSTER BUTONU --- */}
        {(stats.lawyers?.exists || stats.students?.exists) && (
            <div className="flex justify-center mt-4">
                <button 
                    onClick={() => setShowDemographics(!showDemographics)}
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-full transition-all"
                >
                    <BarChart2 size={14} />
                    {showDemographics ? "Detaylı Analizi Gizle" : "Mesleki Kırılımı Göster"}
                </button>
            </div>
        )}

        {/* DETAYLI KIRILIMLAR (DEMOGRAFİK) - SADECE BUTONA BASINCA AÇILIR */}
        <AnimatePresence>
            {showDemographics && (stats.lawyers?.exists || stats.students?.exists) && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-2 border-t border-slate-100">
                        
                        {stats.lawyers?.exists && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase size={14} className="text-slate-500" />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Avukatlar ({stats.lawyers.percentA}%)</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${stats.lawyers.percentA}%` }} className="bg-emerald-600 h-full"></div>
                                    <div style={{ width: `${100 - stats.lawyers.percentA}%` }} className="bg-rose-600 h-full"></div>
                                </div>
                            </div>
                        )}

                        {stats.students?.exists && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap size={14} className="text-slate-500" />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Öğrenciler ({stats.students.percentA}%)</span>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${stats.students.percentA}%` }} className="bg-emerald-600 h-full"></div>
                                    <div style={{ width: `${100 - stats.students.percentA}%` }} className="bg-rose-600 h-full"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>

      {/* 2. Etkileşim Alanı (Yorumlar ve Oy Değiştirme) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* SOL: A Tarafı */}
         <div className={`p-4 rounded-3xl border transition-all ${userVote === 'A' ? 'bg-emerald-50/50 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 opacity-80 hover:opacity-100'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                    <ThumbsUp size={18} /> {debate.option_a}
                </h3>
                {(!userVote || userVote !== 'A') && (
                    <button 
                        onClick={() => handleVote('A')}
                        disabled={voting}
                        className="text-[10px] bg-white border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-full font-bold hover:bg-emerald-50 transition-colors flex items-center gap-1 shadow-sm"
                    >
                        {userVote ? <><RefreshCcw size={12} /> Fikrimi Buraya Çevir</> : 'Bu Tarafı Seç'}
                    </button>
                )}
            </div>
            
            <div className="flex gap-2 mb-2">
                <input 
                    type="text" 
                    value={userVote === 'A' ? commentText : ''}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={userVote === 'A' ? "Destekleyici argüman yaz..." : "Yorum yapmak için bu tarafı seçmelisin"}
                    disabled={userVote !== 'A'}
                    className="flex-1 text-xs p-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && userVote === 'A' && handleSendComment('A', commentText)}
                />
                <button 
                    onClick={() => handleSendComment('A', commentText)} 
                    disabled={sending || userVote !== 'A'}
                    className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                </button>
            </div>

            {renderCommentList(commentsA, 'A')}
         </div>

         {/* SAĞ: B Tarafı */}
         <div className={`p-4 rounded-3xl border transition-all ${userVote === 'B' ? 'bg-rose-50/50 border-rose-200 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 opacity-80 hover:opacity-100'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-rose-800 flex items-center gap-2">
                    <ThumbsDown size={18} /> {debate.option_b}
                </h3>
                {(!userVote || userVote !== 'B') && (
                    <button 
                        onClick={() => handleVote('B')}
                        disabled={voting}
                        className="text-[10px] bg-white border border-rose-200 text-rose-600 px-3 py-1.5 rounded-full font-bold hover:bg-rose-50 transition-colors flex items-center gap-1 shadow-sm"
                    >
                        {userVote ? <><RefreshCcw size={12} /> Fikrimi Buraya Çevir</> : 'Bu Tarafı Seç'}
                    </button>
                )}
            </div>

            <div className="flex gap-2 mb-2">
                <input 
                    type="text" 
                    value={userVote === 'B' ? commentText : ''}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={userVote === 'B' ? "Karşıt argüman yaz..." : "Yorum yapmak için bu tarafı seçmelisin"}
                    disabled={userVote !== 'B'}
                    className="flex-1 text-xs p-3 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && userVote === 'B' && handleSendComment('B', commentText)}
                />
                <button 
                    onClick={() => handleSendComment('B', commentText)} 
                    disabled={sending || userVote !== 'B'}
                    className="bg-rose-600 text-white p-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                </button>
            </div>

            {renderCommentList(commentsB, 'B')}
         </div>
      </div>

    </div>
  );
}