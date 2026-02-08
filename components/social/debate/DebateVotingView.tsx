'use client';

import { motion } from "framer-motion";
import { Scale, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  topic: string;
  optionA: string;
  optionB: string;
  onVote: (choice: 'A' | 'B') => void;
  isVoting: boolean;
}

export default function DebateVotingView({ topic, optionA, optionB, onVote, isVoting }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in-95 duration-500">
      
      {/* İkon ve Başlık */}
      <div className="bg-amber-100 p-4 rounded-full mb-6 shadow-sm">
        <Scale size={48} className="text-amber-600" />
      </div>
      
      <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-2 max-w-2xl leading-tight">
        {topic}
      </h2>
      <p className="text-slate-500 mb-10 font-medium">Sonuçları görmek ve tartışmaya katılmak için tarafını seç.</p>

      {/* Butonlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        
        {/* A Seçeneği Butonu */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onVote('A')}
          disabled={isVoting}
          className="group relative overflow-hidden bg-white border-2 border-emerald-100 hover:border-emerald-500 rounded-2xl p-8 text-left transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/10"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-emerald-600 text-sm tracking-widest">A SEÇENEĞİ</span>
            <CheckCircle2 size={24} className="text-emerald-200 group-hover:text-emerald-500 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
            {optionA}
          </h3>
        </motion.button>

        {/* B Seçeneği Butonu */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onVote('B')}
          disabled={isVoting}
          className="group relative overflow-hidden bg-white border-2 border-rose-100 hover:border-rose-500 rounded-2xl p-8 text-left transition-all shadow-sm hover:shadow-xl hover:shadow-rose-500/10"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-rose-600 text-sm tracking-widest">B SEÇENEĞİ</span>
            <XCircle size={24} className="text-rose-200 group-hover:text-rose-500 transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 group-hover:text-rose-700 transition-colors">
            {optionB}
          </h3>
        </motion.button>

      </div>

      {isVoting && (
        <p className="mt-6 text-slate-400 text-sm animate-pulse">Oyunuz kaydediliyor...</p>
      )}
    </div>
  );
}