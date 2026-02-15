'use client';

import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import PersuasionButton from "./PersuasionButton"; // YENİ: Butonu import ettik

interface Props {
  side: 'A' | 'B';
  title: string;
  count: number;
  comments: any[];
  onSend: () => void;
  inputText: string;
  setInputText: (text: string) => void;
  isSending: boolean;
}

export default function DebateCommentColumn({ 
  side, title, count, comments, onSend, inputText, setInputText, isSending 
}: Props) {
  
  const isGreen = side === 'A';
  const colorTheme = {
    bgSoft: isGreen ? 'bg-emerald-50/50' : 'bg-rose-50/50',
    borderSoft: isGreen ? 'border-emerald-100' : 'border-rose-100',
    textDark: isGreen ? 'text-emerald-800' : 'text-rose-800',
    textBase: isGreen ? 'text-emerald-600' : 'text-rose-600',
    fillBase: isGreen ? 'fill-emerald-600' : 'fill-rose-600',
    borderLeft: isGreen ? 'border-l-emerald-400' : 'border-l-rose-400',
    btnBg: isGreen ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700',
    Icon: isGreen ? ThumbsUp : ThumbsDown
  };

  return (
    <div className="flex flex-col gap-4 h-full">
       
       {/* Başlık */}
       <div className={`${colorTheme.bgSoft} border ${colorTheme.borderSoft} p-4 rounded-2xl flex items-center justify-between`}>
          <h3 className={`font-bold ${colorTheme.textDark} flex items-center gap-2 text-sm`}>
             <colorTheme.Icon size={18} className={`${colorTheme.fillBase} ${colorTheme.textBase}`} />
             {title}
          </h3>
          <span className={`text-xs font-semibold bg-white px-2 py-1 rounded-md ${colorTheme.textBase} shadow-sm border ${colorTheme.borderSoft}`}>
            {count} Oy
          </span>
       </div>
       
       {/* Yorum Listesi */}
       <div className="space-y-3 max-h-[500px] min-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {comments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic flex flex-col items-center">
                  <span className="text-2xl mb-2 opacity-50">💬</span>
                  Henüz bu tarafı savunan bir yorum yok. <br/> İlk kıvılcımı sen çak!
              </div>
          ) : (
              comments.map((c: any) => (
                <div key={c.id} className={`bg-white p-3 rounded-xl border-l-4 ${colorTheme.borderLeft} shadow-sm border border-slate-100 flex gap-3`}>
                   
                   {/* YENİ: İkna Butonu Entegrasyonu */}
                   <div className="pt-1">
                      <PersuasionButton 
                        debateId={c.debate_id}
                        commentId={c.id}
                        authorId={c.user_id}
                        initialCount={c.persuasion_count || 0}
                        initialHasPersuaded={c.hasPersuaded}
                        isOwnComment={c.isOwnComment}
                      />
                   </div>

                   {/* Yorum İçeriği */}
                   <div className="flex-1">
                       <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                  {c.profiles?.avatar_url ? (
                                    <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400">?</div>
                                  )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-slate-900 leading-none">
                                    {c.profiles?.full_name || 'Anonim'}
                                </span>
                                {c.profiles?.job_title && (
                                    <span className="text-[9px] text-slate-500 mt-0.5">{c.profiles.job_title}</span>
                                )}
                              </div>
                          </div>
                          <span className="text-[9px] text-slate-400">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: tr })}
                          </span>
                       </div>
                       <p className="text-slate-700 text-sm leading-relaxed mt-1">{c.content}</p>
                   </div>
                </div>
              ))
          )}
       </div>
       
       {/* Input Alanı */}
       <div className="mt-auto bg-white p-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 pl-4 focus-within:ring-2 ring-slate-200 transition-all">
          <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`${title} için bir argüman yaz...`}
              className="flex-1 bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400"
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
          />
          <button 
            onClick={onSend}
            disabled={isSending || !inputText.trim()}
            className={`${colorTheme.btnBg} text-white p-2 rounded-full transition-colors disabled:opacity-50`}
          >
              {isSending ? <span className="animate-spin block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> : <Send size={16} />}
          </button>
       </div>
    </div>
  );
}