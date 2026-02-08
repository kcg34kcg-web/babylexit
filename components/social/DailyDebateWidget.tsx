'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { getDailyDebate, voteDailyDebate } from '@/app/actions/debate';
import { toast } from 'react-hot-toast';

interface DailyDebateWidgetProps {
  preloadedData?: any;
}

export default function DailyDebateWidget({ preloadedData }: DailyDebateWidgetProps) {
  const [debate, setDebate] = useState<any>(preloadedData || null);
  const [loading, setLoading] = useState(!preloadedData);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!debate) loadDebate();
  }, [preloadedData]);

  const loadDebate = async () => {
    setLoading(true);
    const data = await getDailyDebate();
    setDebate(data);
    setLoading(false);
  };

  const handleVote = async (choice: 'A' | 'B') => {
    if (voting) return;
    setVoting(true);
    
    // Optimistic Update
    const newStats = { ...debate.stats };
    if(choice === 'A') newStats.a++; else newStats.b++;
    newStats.total++;
    
    setDebate({ ...debate, userVote: choice, stats: newStats });

    const res = await voteDailyDebate(debate.id, choice);
    if (res.error) {
      toast.error(res.error);
      if (!preloadedData) loadDebate(); 
    } else {
      toast.success("Oyunuz kaydedildi!");
    }
    setVoting(false);
  };

  if (loading) return <div className="h-24 bg-slate-100 animate-pulse rounded-xl w-full"></div>;
  if (!debate) return null;

  const percentA = debate.stats.total > 0 ? Math.round((debate.stats.a / debate.stats.total) * 100) : 0;
  const percentB = debate.stats.total > 0 ? Math.round((debate.stats.b / debate.stats.total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-3 text-white shadow-md relative overflow-hidden border border-slate-700/50">
      <div className="absolute -top-4 -right-4 text-white/5 rotate-12">
        <Sparkles size={60} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-2 text-amber-400/90">
          <BrainCircuit size={14} />
          <h3 className="font-bold text-[10px] tracking-widest uppercase">Günün Sorusu</h3>
        </div>

        <h2 className="font-semibold text-sm leading-snug mb-3 text-slate-100 pr-2">
          {debate.topic}
        </h2>

        {!debate.userVote ? (
          <div className="space-y-1.5">
            <button 
              onClick={() => handleVote('A')}
              disabled={voting}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg text-left text-xs transition-all flex justify-between items-center group"
            >
              <span className="group-hover:text-amber-200 transition-colors">{debate.option_a}</span>
              {voting && <span className="animate-spin text-[10px]">⌛</span>}
            </button>
            <button 
              onClick={() => handleVote('B')}
              disabled={voting}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg text-left text-xs transition-all group"
            >
              <span className="group-hover:text-blue-200 transition-colors">{debate.option_b}</span>
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-2 mb-3">
              <div className="relative h-6 bg-slate-950/50 rounded-md overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-1000" style={{ width: `${percentA}%` }} />
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold z-10">
                  <span className="truncate max-w-[70%] text-white shadow-black drop-shadow-sm opacity-90">{debate.option_a}</span>
                  <span className="text-white shadow-black drop-shadow-sm">%{percentA}</span>
                </div>
              </div>

              <div className="relative h-6 bg-slate-950/50 rounded-md overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-1000" style={{ width: `${percentB}%` }} />
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-bold z-10">
                  <span className="truncate max-w-[70%] text-white shadow-black drop-shadow-sm opacity-90">{debate.option_b}</span>
                  <span className="text-white shadow-black drop-shadow-sm">%{percentB}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 items-start opacity-70">
               <Sparkles size={10} className="text-emerald-400 mt-0.5 shrink-0" />
               {/* ✅ DÜZELTME BURADA: ai_opinion -> ai_summary */}
               <p className="text-[10px] text-slate-300 italic leading-tight line-clamp-2">
                 "{debate.ai_summary}"
               </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}