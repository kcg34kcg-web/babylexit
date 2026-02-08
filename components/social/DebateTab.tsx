'use client';

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Sparkles, Send } from "lucide-react";
import { getDailyDebate, getDebateComments, postDebateComment, voteDailyDebate } from "@/app/actions/debate";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function DebateTab() {
  // Verileri tutacak state'ler
  const [debate, setDebate] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Yorum yazma inputları
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [sending, setSending] = useState(false);

  // Sayfa açılınca verileri çek
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getDailyDebate();
      if (data) {
        setDebate(data);
        const coms = await getDebateComments(data.id);
        setComments(coms);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Yorum Gönderme ve Otomatik Oy Verme Fonksiyonu
  const handleAction = async (side: 'A' | 'B', text: string) => {
    if (!text.trim()) return;
    setSending(true);

    // 1. Eğer kullanıcı henüz oy vermediyse, yorum yazdığı tarafa oyunu sayalım
    if (debate && !debate.userVote) {
       await voteDailyDebate(debate.id, side);
    }

    // 2. Yorumu gönderelim
    const res = await postDebateComment(debate.id, text, side);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Argümanınız eklendi!");
      if (side === 'A') setTextA(""); else setTextB("");
      await loadData(); // Verileri yenile
    }
    setSending(false);
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Yükleniyor...</div>;
  if (!debate) return null;

  // İstatistik hesaplama
  const stats = debate.stats || { a: 0, b: 0, total: 0 };
  const percentA = stats.total > 0 ? Math.round((stats.a / stats.total) * 100) : 50;
  
  // Yorumları ayırma
  const commentsA = comments.filter(c => c.side === 'A');
  const commentsB = comments.filter(c => c.side === 'B');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* ÜST KISIM: GÜNÜN SORUSU */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-slate-200 to-rose-500"></div>
        
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
          {debate.topic}
        </h2>

        {/* AI ÖZETİ */}
        {debate.ai_summary && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 max-w-3xl mx-auto flex gap-3 text-left">
             <div className="bg-purple-100 p-2 rounded-lg h-fit">
                <Sparkles size={20} className="text-purple-600" />
             </div>
             <div>
                <p className="text-xs font-bold text-purple-600 mb-1 uppercase tracking-wide">AI Tarafsız Özet</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {debate.ai_summary}
                </p>
             </div>
          </div>
        )}

        {/* İSTATİSTİK ÇUBUĞU */}
        <div className="mt-8 flex items-center justify-center gap-4 text-sm font-bold">
           <span className="text-emerald-600">%{percentA} {debate.option_a}</span>
           <div className="w-64 h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${percentA}%` }} className="bg-emerald-500 h-full transition-all duration-500"></div>
              <div style={{ width: `${100 - percentA}%` }} className="bg-rose-500 h-full transition-all duration-500"></div>
           </div>
           <span className="text-rose-600">%{100 - percentA} {debate.option_b}</span>
        </div>
      </div>

      {/* ALT KISIM: BÖLÜNMÜŞ EKRAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SOL TARAF: KATILIYORUM (Yeşil/Mavi Tonlar) */}
        <div className="flex flex-col gap-4">
           <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                 <ThumbsUp size={20} className="fill-emerald-600 text-emerald-600" />
                 KATILIYORUM
              </h3>
              <span className="text-xs font-semibold bg-white px-2 py-1 rounded-md text-emerald-600 shadow-sm">
                {stats.a} Oy
              </span>
           </div>
           
           {/* Yorum Akışı */}
           <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {commentsA.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-xl border-l-4 border-l-emerald-400 shadow-sm border border-slate-100">
                   <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm text-slate-900">{c.profiles?.full_name || 'Anonim'}</span>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                      </span>
                   </div>
                   <p className="text-slate-700 text-sm">{c.content}</p>
                </div>
              ))}
           </div>
           
           {/* Yorum Yapma Inputu (Yeşil) */}
           <div className="mt-auto bg-white p-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 pl-4">
              <input 
                 type="text" 
                 value={textA}
                 onChange={(e) => setTextA(e.target.value)}
                 placeholder="Destekleyen bir argüman yaz..." 
                 className="flex-1 bg-transparent outline-none text-sm"
                 onKeyDown={(e) => e.key === 'Enter' && handleAction('A', textA)}
              />
              <button 
                onClick={() => handleAction('A', textA)}
                disabled={sending}
                className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                 <Send size={16} />
              </button>
           </div>
        </div>

        {/* SAĞ TARAF: KATILMIYORUM (Kırmızı/Turuncu Tonlar) */}
        <div className="flex flex-col gap-4">
           <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
              <h3 className="font-bold text-rose-800 flex items-center gap-2">
                 <ThumbsDown size={20} className="fill-rose-600 text-rose-600" />
                 KATILMIYORUM
              </h3>
              <span className="text-xs font-semibold bg-white px-2 py-1 rounded-md text-rose-600 shadow-sm">
                {stats.b} Oy
              </span>
           </div>

           {/* Yorum Akışı */}
           <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {commentsB.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-xl border-l-4 border-l-rose-400 shadow-sm border border-slate-100">
                   <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm text-slate-900">{c.profiles?.full_name || 'Anonim'}</span>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                      </span>
                   </div>
                   <p className="text-slate-700 text-sm">{c.content}</p>
                </div>
              ))}
           </div>

           {/* Yorum Yapma Inputu (Kırmızı) */}
           <div className="mt-auto bg-white p-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 pl-4">
              <input 
                 type="text" 
                 value={textB}
                 onChange={(e) => setTextB(e.target.value)}
                 placeholder="Karşıt bir argüman yaz..." 
                 className="flex-1 bg-transparent outline-none text-sm"
                 onKeyDown={(e) => e.key === 'Enter' && handleAction('B', textB)}
              />
              <button 
                onClick={() => handleAction('B', textB)}
                disabled={sending}
                className="bg-rose-600 text-white p-2 rounded-full hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                 <Send size={16} />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}