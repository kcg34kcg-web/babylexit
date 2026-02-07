'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Gamepad2, Wind, BookOpen, Quote, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PulseFooter } from './ui/PulseFooter';

// --- MODÜLLER (ARTIK AKTİF) ---
import { TriviaCard } from '@/components/lounge/modules/TriviaCard';
import { WisdomQuote } from '@/components/lounge/modules/WisdomQuote';
import { ZenBreathing } from '@/components/lounge/modules/ZenBreathing';
import { SmartReader } from '@/components/lounge/modules/SmartReader';
import { MiniGame } from '@/components/lounge/modules/MiniGame'

type LoungeMode = 'trivia' | 'wisdom' | 'zen' | 'read' | 'game';

interface LoungeContainerProps {
  isFinished: boolean;      // Backend işlemi bitti mi?
  onComplete: () => void;   // "Sonucu Gör" butonuna basınca
}

export default function LoungeContainer({ isFinished, onComplete }: LoungeContainerProps) {
  // Başlangıç modumuz Trivia olsun
  const [activeMode, setActiveMode] = useState<LoungeMode>('trivia');

  // Arka Plan Renk Geçişleri (Moda göre değişen atmosfer)
  const getGradient = () => {
    switch (activeMode) {
      case 'game': return 'from-amber-900/40 via-purple-900/40 to-slate-900';
      case 'zen': return 'from-emerald-900/40 via-teal-900/40 to-slate-900';
      case 'wisdom': return 'from-indigo-900/40 via-slate-900 to-black';
      case 'read': return 'from-blue-900/40 via-slate-900 to-slate-950';
      default: return 'from-violet-900/40 via-fuchsia-900/40 to-slate-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-hidden transition-colors duration-1000 font-sans">
      
      {/* 1. DİNAMİK ARKA PLAN (Aurora Mesh) */}
      <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-1000", getGradient())} />
      
      {/* Ambient Lights (Yüzen Işıklar) */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"
      />
      
      {/* 2. ANA SAHNE (Modüller Burada Yüklenir) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
             key={activeMode}
             initial={{ opacity: 0, y: 10, scale: 0.98 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: -10, scale: 1.02, transition: { duration: 0.2 } }}
             transition={{ duration: 0.4, ease: "easeOut" }}
             className="w-full"
          >
             {activeMode === 'trivia' && <TriviaCard />}
             {activeMode === 'wisdom' && <WisdomQuote />}
             {activeMode === 'zen' && <ZenBreathing />}
             {activeMode === 'read' && <SmartReader />}
             {activeMode === 'game' && <MiniGame />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. NAVİGASYON (Glassmorphism Dock) */}
      <div className="relative z-20 px-6 pb-24 flex justify-center">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 flex gap-1 shadow-2xl max-w-md w-full ring-1 ring-white/5">
           <NavButton active={activeMode === 'trivia'} onClick={() => setActiveMode('trivia')} icon={<Brain size={20}/>} label="Bilgi" />
           <NavButton active={activeMode === 'wisdom'} onClick={() => setActiveMode('wisdom')} icon={<Quote size={20}/>} label="Bilgelik" />
           <NavButton active={activeMode === 'zen'} onClick={() => setActiveMode('zen')} icon={<Wind size={20}/>} label="Nefes" />
           <NavButton active={activeMode === 'read'} onClick={() => setActiveMode('read')} icon={<BookOpen size={20}/>} label="Okuma" />
           <NavButton active={activeMode === 'game'} onClick={() => setActiveMode('game')} icon={<Gamepad2 size={20}/>} label="Oyun" />
        </div>
      </div>

      {/* 4. ALT DURUM ÇUBUĞU */}
      <PulseFooter />

      {/* 5. SONUÇ BİLDİRİMİ (İşlem bitince alttan çıkar) */}
      <AnimatePresence>
        {isFinished && (
           <motion.div 
              initial={{ y: 100, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100 }}
              className="absolute bottom-20 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none"
           >
              <button 
                  onClick={onComplete}
                  className="pointer-events-auto bg-emerald-500 hover:bg-emerald-400 text-white pl-6 pr-8 py-3 rounded-full font-bold shadow-lg shadow-emerald-500/40 animate-bounce flex items-center gap-3 group transition-all hover:scale-105"
              >
                  <div className="bg-white/20 p-1 rounded-full"><CheckCircle size={18} className="text-white" /></div>
                  <span className="text-sm">Analiz Hazır! Sonucu Gör</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Navigasyon Butonu Bileşeni
function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 relative overflow-hidden group",
        active ? "text-white bg-white/10 shadow-inner" : "text-white/40 hover:bg-white/5 hover:text-white/70"
      )}
    >
      {active && <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/5 rounded-xl" />}
      <div className={cn("mb-1 transition-transform duration-300 relative z-10", active ? "scale-110 text-cyan-300" : "group-hover:scale-110")}>
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider relative z-10">{label}</span>
    </button>
  );
}