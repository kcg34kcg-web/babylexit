'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCcw } from 'lucide-react';

// --- STATİK VERİ HAVUZU ---
const QUOTES = [
  { 
    text: "Adalet mülkün temelidir.", 
    author: "Mustafa Kemal Atatürk",
    era: "Cumhuriyet Dönemi"
  },
  { 
    text: "Hukuk, aklın kaba kuvvete karşı zaferidir.", 
    author: "Rudolf von Jhering",
    era: "19. Yüzyıl"
  },
  { 
    text: "Bir suçlunun cezasız kalması, bir masumun mahkum olmasından iyidir.", 
    author: "Roma Hukuku İlkesi",
    era: "Antik Çağ"
  },
  { 
    text: "Kanunlar örümcek ağı gibidir; küçük sinekler takılır, büyükler deler geçer.", 
    author: "Honoré de Balzac",
    era: "Fransız Edebiyatı"
  },
  { 
    text: "Adaletsizliği işleyen, çekenden daha sefildir.", 
    author: "Platon",
    era: "Antik Yunan"
  }
];

// --- PARTİKÜL EFEKTİ (TOZ ZERRECİKLERİ) ---
const FloatingParticles = () => {
  // Rastgele 15 partikül oluştur
  const particles = Array.from({ length: 15 });
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white/20 rounded-full blur-[1px]"
          style={{
            width: Math.random() * 4 + 1 + 'px',
            height: Math.random() * 4 + 1 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
          }}
          animate={{
            y: [0, -100, 0], // Yukarı aşağı süzülme
            x: [0, Math.random() * 50 - 25, 0], // Hafif sağa sola
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10, // 10-20 sn süren yavaş hareket
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export const WisdomQuote = () => {
  const [index, setIndex] = useState(0);
  // Animasyonun tekrar tetiklenmesi için key değiştiriyoruz
  const [key, setKey] = useState(0);

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % QUOTES.length);
    setKey((prev) => prev + 1);
  };

  const currentQuote = QUOTES[index];

  return (
    <div className="w-full h-[320px] relative overflow-hidden rounded-3xl bg-black/20 border border-white/5 shadow-2xl flex flex-col items-center justify-center p-8 md:p-12">
      
      {/* 1. ATMOSFERİK ARKA PLAN */}
      <FloatingParticles />
      
      {/* Hafif bir ışık huzmesi (Spotlight) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      {/* 2. İÇERİK ALANI */}
      <AnimatePresence mode='wait'>
        <motion.div 
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center max-w-lg"
        >
          {/* İkon */}
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex mb-6 text-amber-200/80"
          >
            <Sparkles size={32} />
          </motion.div>

          {/* Söz (Daktilo Efekti Benzeri Kelime Kelime Gelme) */}
          <h2 className="text-2xl md:text-3xl font-serif text-slate-100 leading-relaxed italic mb-6 min-h-[120px] flex items-center justify-center">
            <span className="inline-block">
               {/* Tırnak İşareti Sol */}
               <span className="text-amber-500/50 text-4xl mr-2">“</span>
               
               {currentQuote.text.split(" ").map((word, i) => (
                 <motion.span
                   key={i}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.15 + 0.5, duration: 0.5 }} // Kelime kelime gecikme
                   className="inline-block mr-1.5"
                 >
                   {word}
                 </motion.span>
               ))}

               {/* Tırnak İşareti Sağ */}
               <span className="text-amber-500/50 text-4xl ml-1">”</span>
            </span>
          </h2>

          {/* Yazar ve Dönem */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }} // Söz bittikten sonra belirir
            className="flex flex-col items-center gap-1"
          >
            <span className="text-amber-400 font-bold tracking-widest text-sm uppercase">
              — {currentQuote.author}
            </span>
            <span className="text-white/30 text-[10px] uppercase tracking-wider border-t border-white/10 pt-1 px-4">
              {currentQuote.era}
            </span>
          </motion.div>

        </motion.div>
      </AnimatePresence>

      {/* 3. KONTROLLER */}
      <div className="absolute bottom-4 right-4 z-20">
        <button 
          onClick={handleNext}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all backdrop-blur-sm border border-white/5 group"
          title="Sonraki Söz"
        >
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>

    </div>
  );
};