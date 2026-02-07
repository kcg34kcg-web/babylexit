'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const LOADING_MESSAGES = [
  "Nöronlar ateşleniyor...",
  "Hukuki veri okyanusu taranıyor...",
  "Emsal kararlar analiz ediliyor...",
  "Mantıksal sentez yapılıyor...",
  "Cevap hazırlanıyor..."
];

export const PulseFooter = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500); // Her 2.5 saniyede bir mesaj değişir
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950/80 backdrop-blur-md border-t border-slate-800 p-4 absolute bottom-0 left-0 z-50">
      <div className="max-w-md mx-auto w-full">
        
        {/* Mesaj Animasyonu */}
        <div className="h-6 relative overflow-hidden flex justify-center items-center mb-3">
          <AnimatePresence mode='wait'>
            <motion.div
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-xs font-mono text-cyan-400/80 uppercase tracking-widest"
            >
              <Sparkles size={12} className="animate-pulse" />
              {LOADING_MESSAGES[msgIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Neon Progress Bar (Knight Rider Style) */}
        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden relative shadow-[0_0_10px_rgba(34,211,238,0.1)]">
          <motion.div
            className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-500 to-transparent blur-[2px]"
            animate={{
              x: ["-100%", "300%"],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "linear",
            }}
          />
        </div>
        
      </div>
    </div>
  );
};