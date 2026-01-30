import { Bot, ShieldCheck, AlertTriangle } from 'lucide-react';

export function AIReview({ score, critique }: { score: number; critique: string }) {
  if (!critique) return null;

  return (
    <div className="mt-4 bg-slate-900 border border-amber-500/20 rounded-xl overflow-hidden">
      <div className="bg-amber-500/5 px-4 py-2 flex items-center justify-between border-b border-amber-500/10">
        <div className="flex items-center gap-2 text-amber-500 font-bold text-[10px] uppercase tracking-widest">
          <Bot size={14} /> Babylexit AI Denetimi
        </div>
        <div className={`text-[10px] font-black px-2 py-0.5 rounded ${
          score > 70 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          GÜVEN SKORU: %{score}
        </div>
      </div>
      <div className="p-4">
        <p className="text-slate-300 text-sm italic leading-relaxed whitespace-pre-line">
          "{critique}"
        </p>
      </div>
    </div>
  );
}