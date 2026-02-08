'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { getDailyDebate, voteDailyDebate } from '@/app/actions/debate';
import { toast } from 'react-hot-toast';

export default function DailyDebateWidget() {
  const [debate, setDebate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    loadDebate();
  }, []);

  const loadDebate = async () => {
    const data = await getDailyDebate();
    setDebate(data);
    setLoading(false);
  };

  const handleVote = async (choice: 'A' | 'B') => {
    if (voting) return;
    setVoting(true);
    
    // Optimistic Update (Anlık hissettirmek için)
    const newStats = { ...debate.stats };
    if(choice === 'A') newStats.a++; else newStats.b++;
    newStats.total++;
    
    setDebate({ ...debate, userVote: choice, stats: newStats });

    const res = await voteDailyDebate(debate.id, choice);
    if (res.error) {
      toast.error(res.error);
      loadDebate(); // Geri al
    } else {
      toast.success("Oyunuz kaydedildi!");
    }
    setVoting(false);
  };

  if (loading) return <div className="h-32 bg-slate-200 animate-pulse rounded-xl"></div>;
  if (!debate) return null;

  const percentA = debate.stats.total > 0 ? Math.round((debate.stats.a / debate.stats.total) * 100) : 0;
  const percentB = debate.stats.total > 0 ? Math.round((debate.stats.b / debate.stats.total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-4 text-white shadow-lg overflow-hidden relative group">
      {/* Arka plan efekti */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles size={100} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3 text-amber-400">
          <BrainCircuit size={18} />
          <h3 className="font-bold text-xs tracking-widest uppercase">Günün Tartışması</h3>
        </div>

        <h2 className="font-semibold text-lg leading-tight mb-4 min-h-[3rem]">
          {debate.topic}
        </h2>

        {!debate.userVote ? (
          <div className="space-y-2">
            <button 
              onClick={() => handleVote('A')}
              disabled={voting}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/10 p-3 rounded-lg text-left text-sm transition-all hover:scale-[1.02] active:scale-95 flex justify-between items-center"
            >
              <span>{debate.option_a}</span>
              {voting && <span className="animate-spin">⌛</span>}
            </button>
            <button 
              onClick={() => handleVote('B')}
              disabled={voting}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/10 p-3 rounded-lg text-left text-sm transition-all hover:scale-[1.02] active:scale-95"
            >
              {debate.option_b}
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Sonuç Barları */}
            <div className="space-y-3 mb-4">
              <div className="relative h-10 bg-slate-800 rounded-lg overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-1000" 
                    style={{ width: `${percentA}%` }} 
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold z-10 shadow-sm">
                  <span className="truncate max-w-[70%] text-white drop-shadow-md">{debate.option_a}</span>
                  <span className="text-white drop-shadow-md">%{percentA}</span>
                </div>
              </div>

              <div className="relative h-10 bg-slate-800 rounded-lg overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${percentB}%` }} 
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold z-10">
                  <span className="truncate max-w-[70%] text-white drop-shadow-md">{debate.option_b}</span>
                  <span className="text-white drop-shadow-md">%{percentB}</span>
                </div>
              </div>
            </div>

            {/* AI Yorumu */}
            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="flex items-center gap-2 mb-1 text-emerald-400 text-xs font-bold">
                <Sparkles size={12} />
                <span>AI GÖRÜŞÜ</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{debate.ai_opinion}"
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}