'use client';

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Sparkles, Send, ChevronUp, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { getDailyDebate, getDebateComments, postDebateComment, voteDailyDebate, voteComment } from "@/app/actions/debate";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  debateData?: any; 
}

export default function DebateResultsView({ debateData }: Props) {
  const [debate, setDebate] = useState<any>(debateData || null);
  const [comments, setComments] = useState<any[]>([]);
  // Eğer prop geldiyse loading false olsun, gelmediyse true
  const [loading, setLoading] = useState(!debateData);
  
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Eğer prop olarak veri gelmediyse kendimiz çekelim
    if (!debateData) {
        loadData();
    } else {
        // Prop geldiyse sadece yorumları yükleyelim
        loadComments(debateData.id);
    }
  }, [debateData]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getDailyDebate();
      if (data) {
        setDebate(data);
        await loadComments(data.id);
      }
    } catch (error) {
      console.error("Debate fetch error:", error);
      toast.error("Veri çekilirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (id: string) => {
      const coms = await getDebateComments(id);
      setComments(coms || []);
  };

  const handleAction = async (side: 'A' | 'B', text: string) => {
    if (!text.trim()) return;
    if (!debate) return;

    setSending(true);

    if (!debate.userVote) {
       const voteRes = await voteDailyDebate(debate.id, side);
       if (voteRes?.error) { // Optional chaining eklendi
           toast.error(voteRes.error);
           setSending(false);
           return;
       }
       setDebate((prev: any) => ({ ...prev, userVote: side }));
    } else if (debate.userVote !== side) {
        toast.error(`Siz ${debate.userVote} tarafındasınız, karşı tarafa yazamazsınız!`);
        setSending(false);
        return;
    }

    const res = await postDebateComment(debate.id, text, side);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Argümanınız eklendi!");
      if (side === 'A') setTextA(""); else setTextB("");
      await loadComments(debate.id);
    }
    setSending(false);
  };

  const handleCommentVote = async (commentId: string, type: 1 | -1) => {
      if(!debate) return;
      const res = await voteComment(commentId, type);
      if (res?.error) toast.error(res.error);
      else await loadComments(debate.id);
  };

  // --- KRİTİK DÜZELTME: YÜKLENİYOR DURUMU ---
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="animate-spin text-amber-500" size={32} />
        <p className="text-sm font-medium animate-pulse">Arena hazırlanıyor...</p>
    </div>
  );

  // --- KRİTİK DÜZELTME: VERİ YOK DURUMU ---
  // Eskiden burası "return null" idi, hatanın kaynağı buydu.
  if (!debate) return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mt-4">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <AlertCircle size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">Aktif Münazara Yok</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-md">
           Şu anda oylamaya açık bir konu bulunmuyor. Yeni bir tartışma konusu çok yakında eklenecek.
        </p>
    </div>
  );

  const stats = debate.stats || { a: 0, b: 0, total: 0 };
  const percentA = stats.total > 0 ? Math.round((stats.a / stats.total) * 100) : 50;
  
  const commentsA = comments.filter(c => c.side === 'A');
  const commentsB = comments.filter(c => c.side === 'B');

  const renderCommentList = (list: any[]) => (
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
          {list.length === 0 && (
             <p className="text-xs text-slate-400 text-center py-4 italic">Henüz bu tarafta bir argüman yok.</p>
          )}
          {list.map((c) => (
            <div key={c.id} className="bg-white p-3 rounded-xl border-l-4 border-l-slate-200 shadow-sm border border-slate-100 flex gap-2">
               <div className="flex flex-col items-center gap-1 pt-1">
                   <button onClick={() => handleCommentVote(c.id, 1)} className={`p-1 hover:bg-slate-100 rounded ${c.userVoteStatus === 1 ? 'text-emerald-500' : 'text-slate-400'}`}>
                       <ChevronUp size={16} />
                   </button>
                   <span className="text-[10px] font-bold text-slate-600">{c.score}</span>
                   <button onClick={() => handleCommentVote(c.id, -1)} className={`p-1 hover:bg-slate-100 rounded ${c.userVoteStatus === -1 ? 'text-rose-500' : 'text-slate-400'}`}>
                       <ChevronDown size={16} />
                   </button>
               </div>
               <div className="flex-1">
                   <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs text-slate-900">{c.profiles?.full_name || 'Gizli Üye'}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr }) : ''}
                      </span>
                   </div>
                   <p className="text-slate-700 text-xs leading-relaxed">{c.content}</p>
               </div>
            </div>
          ))}
      </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300 pb-10">
      {/* Üst Kısım: Soru Kartı */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 text-center shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-amber-200 to-rose-500"></div>
        
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
          {debate.topic}
        </h2>

        {debate.ai_summary && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 max-w-3xl mx-auto flex gap-3 text-left">
             <div className="bg-purple-100 p-2 rounded-lg h-fit shrink-0">
                <Sparkles size={18} className="text-purple-600" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-purple-600 mb-1 uppercase tracking-wide">AI Tarafsız Özet</p>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  {debate.ai_summary}
                </p>
             </div>
          </div>
        )}

        {/* İstatistik Çubuğu */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-sm font-bold">
           <span className="text-emerald-600 w-full md:w-auto text-left md:text-right">%{percentA} {debate.option_a}</span>
           <div className="w-full md:w-64 h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${percentA}%` }} className="bg-emerald-500 h-full transition-all duration-700 ease-out relative">
                 <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
              <div style={{ width: `${100 - percentA}%` }} className="bg-rose-500 h-full transition-all duration-700 ease-out relative">
                 <div className="absolute inset-0 bg-white/20 animate-pulse delay-75"></div>
              </div>
           </div>
           <span className="text-rose-600 w-full md:w-auto text-right md:text-left">%{100 - percentA} {debate.option_b}</span>
        </div>
      </div>

      {/* Alt Kısım: Yorumlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SOL: Option A */}
        <div className="flex flex-col gap-4">
           <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2 text-sm">
                 <ThumbsUp size={18} className="fill-emerald-600 text-emerald-600" />
                 {debate.option_a.toUpperCase()}
              </h3>
              <span className="text-xs font-semibold bg-white px-2 py-1 rounded-md text-emerald-600 shadow-sm border border-emerald-100">
                {stats.a} Oy
              </span>
           </div>
           
           {renderCommentList(commentsA)}
           
           <div className="mt-auto bg-white p-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 pl-4 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <input 
                 type="text" 
                 value={textA}
                 onChange={(e) => setTextA(e.target.value)}
                 placeholder={`${debate.option_a} tarafını savun...`}
                 className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
                 onKeyDown={(e) => e.key === 'Enter' && handleAction('A', textA)}
              />
              <button 
                onClick={() => handleAction('A', textA)}
                disabled={sending || !textA.trim()}
                className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:hover:bg-emerald-600"
              >
                 <Send size={16} />
              </button>
           </div>
        </div>

        {/* SAĞ: Option B */}
        <div className="flex flex-col gap-4">
           <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
              <h3 className="font-bold text-rose-800 flex items-center gap-2 text-sm">
                 <ThumbsDown size={18} className="fill-rose-600 text-rose-600" />
                 {debate.option_b.toUpperCase()}
              </h3>
              <span className="text-xs font-semibold bg-white px-2 py-1 rounded-md text-rose-600 shadow-sm border border-rose-100">
                {stats.b} Oy
              </span>
           </div>

           {renderCommentList(commentsB)}

           <div className="mt-auto bg-white p-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 pl-4 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
              <input 
                 type="text" 
                 value={textB}
                 onChange={(e) => setTextB(e.target.value)}
                 placeholder={`${debate.option_b} tarafını savun...`}
                 className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
                 onKeyDown={(e) => e.key === 'Enter' && handleAction('B', textB)}
              />
              <button 
                onClick={() => handleAction('B', textB)}
                disabled={sending || !textB.trim()}
                className="bg-rose-600 text-white p-2 rounded-full hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:hover:bg-rose-600"
              >
                 <Send size={16} />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}