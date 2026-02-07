'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react'; // Share2 kullanılmıyordu, sildim.

const TRIVIA_DATA = [
  { id: 1, category: "HUKUK TARİHİ", text: "İlk avukatlar Antik Roma'da ortaya çıkmıştır, ancak Claudius dönemine kadar ücret almaları yasaktı." },
  { id: 2, category: "İLGİNÇ BİLGİ", text: "Dünyanın en kısa anayasası ABD Anayasasıdır (Yaklaşık 4.400 kelime)." },
  { id: 3, category: "TERMİNOLOJİ", text: "'Mücbir Sebep', hukukta önceden öngörülemeyen ve karşı konulamayan olayları (deprem, savaş vb.) ifade eder." },
  { id: 4, category: "YAPAY ZEKA", text: "Yapay zeka modellerinde 'Hallucination' (Halüsinasyon), olmayan bilgiyi gerçekmiş gibi uydurma durumudur." },
];

export const TriviaCard = () => {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
        setIndex((prev) => (prev + 1) % TRIVIA_DATA.length);
    }, 200);
  };

  const currentFact = TRIVIA_DATA[index];

  return (
    // DÜZELTME: perspective-1000 yerine [perspective:1000px] (JIT mode)
    <div className="w-full h-[320px] relative [perspective:1000px] group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      
      <motion.div
        className="w-full h-full relative preserve-3d transition-all duration-700"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* --- ÖN YÜZ (KAPALI) --- */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center border border-white/10">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <span className="text-4xl text-white font-bold">?</span>
          </div>
          <h3 className="text-2xl font-black text-white text-center tracking-tight">Biliyor muydunuz?</h3>
          <p className="text-white/60 text-sm mt-4 font-medium uppercase tracking-widest">Cevabı görmek için tıkla</p>
        </div>

        {/* --- ARKA YÜZ (AÇIK) --- */}
        <div 
            className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-2xl p-8 flex flex-col justify-between items-center text-center rotate-y-180"
            style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
        >
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black tracking-widest mb-6">
                {currentFact.category}
            </span>
            <p className="text-slate-800 text-lg font-bold leading-relaxed">
              &quot;{currentFact.text}&quot;
            </p>
          </div>
          
          <div className="flex gap-4 w-full mt-4">
             <button 
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-500 transition-colors"
             >
                <RefreshCw size={16} /> Yeni Bilgi
             </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};