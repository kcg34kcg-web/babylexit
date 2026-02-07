'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind } from 'lucide-react';

type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

const PHASES: Record<BreathPhase, { label: string; duration: number; scale: number; color: string }> = {
  'inhale':    { label: "Nefes Al...", duration: 4000, scale: 1.5, color: "from-emerald-400 to-teal-300" },
  'hold-in':   { label: "Tut...",      duration: 2000, scale: 1.5, color: "from-emerald-500 to-teal-400" },
  'exhale':    { label: "Nefes Ver...",duration: 4000, scale: 1.0, color: "from-cyan-400 to-blue-300" },
  'hold-out':  { label: "Bekle...",    duration: 1000, scale: 1.0, color: "from-cyan-500 to-blue-400" }
};

export const ZenBreathing = () => {
  const [phase, setPhase] = useState<BreathPhase>('inhale');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const runCycle = () => {
      const currentConfig = PHASES[phase];
      
      // Haptic Feedback (Mobil Titreşim) - Sadece destekleyen tarayıcılarda
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50); // Hafif bir tık
      }

      timeoutId = setTimeout(() => {
        setPhase((prev) => {
          if (prev === 'inhale') return 'hold-in';
          if (prev === 'hold-in') return 'exhale';
          if (prev === 'exhale') return 'hold-out';
          return 'inhale';
        });
      }, currentConfig.duration);
    };

    runCycle();
    return () => clearTimeout(timeoutId);
  }, [phase]);

  const config = PHASES[phase];

  return (
    <div className="w-full h-[360px] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Arka Plan Hareleri (Eko Efekti) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <motion.div 
            animate={{ scale: config.scale * 1.2, opacity: phase === 'inhale' ? 0.3 : 0 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="w-48 h-48 rounded-full border border-white/10 absolute"
         />
         <motion.div 
            animate={{ scale: config.scale * 1.4, opacity: phase === 'inhale' ? 0.1 : 0 }}
            transition={{ duration: 4, delay: 0.2, ease: "easeInOut" }}
            className="w-48 h-48 rounded-full border border-white/5 absolute"
         />
      </div>

      {/* ANA NEFES KÜRESİ (BLOB) */}
      <div className="relative z-10 w-48 h-48 flex items-center justify-center">
        <motion.div
          animate={{
            scale: config.scale,
            rotate: phase === 'inhale' ? 10 : -10, // Hafif dönme efekti
          }}
          transition={{
            duration: config.duration / 1000,
            ease: "easeInOut" 
          }}
          className={`w-full h-full rounded-full bg-gradient-to-br ${config.color} shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center relative backdrop-blur-md`}
        >
           {/* İç sıvı efekti için ikinci katman */}
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             className="absolute inset-0 rounded-full opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"
           />
           
           <Wind className="text-white drop-shadow-md w-12 h-12" />
        </motion.div>
      </div>

      {/* YÖNLENDİRME METNİ */}
      <div className="mt-12 h-10 flex items-center justify-center">
         <AnimatePresence mode='wait'>
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl font-bold text-white tracking-widest uppercase font-mono"
            >
              {config.label}
            </motion.p>
         </AnimatePresence>
      </div>
      
      <p className="text-white/40 text-xs mt-2">Rahatla ve odaklan</p>

    </div>
  );
};