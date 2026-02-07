'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';

// --- STATİK MAKALE HAVUZU ---
const ARTICLES = [
  {
    id: 1,
    title: "Mağara Kaşifleri Davası",
    subtitle: "Hukuk Felsefesinin En Zor Sorusu",
    readTime: "45 sn",
    content: `
      <p>1949 yılında Lon L. Fuller tarafından kurgulanan bu dava, hukukçuları ikiye böler. Bir grup mağara kaşifi, toprak kayması sonucu mağarada mahsur kalır.</p>
      <br/>
      <p>Kurtarılmaları haftalar sürecektir ve yiyecekleri tükenmiştir. Telsizle ulaştıkları doktorlar, 10 gün daha yemek yemezlerse öleceklerini söyler. Kaşifler, hayatta kalmak için aralarından birini feda etmeye (yemeye) karar verirler ve kura çekerler.</p>
      <br/>
      <p>Kurtarıldıktan sonra hayatta kalanlar "cinayet" suçlamasıyla yargılanır. Pozitif hukuk "Kimseyi kasten öldüremezsiniz" derken, Doğal hukuk "Hayatta kalma içgüdüsü yasaların üzerindedir" der.</p>
      <br/>
      <p><strong>Siz jüri olsaydınız kararınız ne olurdu?</strong> Hukuk sadece kurallar bütünü müdür, yoksa adaleti sağlamak için esnetilebilir mi?</p>
    `
  },
  {
    id: 2,
    title: "Ay'ın Sahibi Kim?",
    subtitle: "Uzay Hukuku ve Gelecek",
    readTime: "50 sn",
    content: `
      <p>1967 Dış Uzay Anlaşması'na göre, hiçbir devlet Ay veya diğer gök cisimleri üzerinde egemenlik iddia edemez. Yani ABD bayrağı dikmek, Ay'ı ABD toprağı yapmaz.</p>
      <br/>
      <p>Ancak "devletler" yasaklanmış olsa da, "özel şirketler" (SpaceX, Blue Origin) için gri alanlar mevcuttur. Bir şirket Mars'ta maden çıkarırsa, o maden kime aittir?</p>
      <br/>
      <p>Lüksemburg ve ABD, çıkardıkları yasalarla "uzay madenciliği" yapan şirketlerin, çıkardıkları materyalin sahibi olacağını kabul etmiştir. Bu durum, "Uzay, tüm insanlığın ortak mirasıdır" ilkesiyle çelişmektedir.</p>
      <br/>
      <p>Geleceğin en büyük davaları Dünya'da değil, yörüngede görülecek.</p>
    `
  }
];

export const SmartReader = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll Progress Hesaplama
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const totalScroll = scrollHeight - clientHeight;
      const currentProgress = (scrollTop / totalScroll) * 100;
      setProgress(currentProgress);
    }
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % ARTICLES.length);
    setProgress(0);
    // Yeni makaleye geçince en üste sar
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const article = ARTICLES[activeIndex];

  return (
    <div className="w-full h-[400px] bg-slate-900/50 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col shadow-2xl backdrop-blur-md">
      
      {/* 1. HEADER & PROGRESS BAR */}
      <div className="absolute top-0 left-0 w-full z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="p-4 flex justify-between items-start">
           <div>
              <h3 className="text-white font-bold text-lg leading-tight">{article.title}</h3>
              <p className="text-blue-400 text-xs font-medium mt-1">{article.subtitle}</p>
           </div>
           <div className="flex items-center gap-1 text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
              <Clock size={12} /> {article.readTime}
           </div>
        </div>
        
        {/* Progress Bar Container */}
        <div className="w-full h-1 bg-slate-800">
           {/* Active Indicator */}
           <motion.div 
             className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
             style={{ width: `${progress}%` }}
             // layout prop'u animasyonun akıcı olmasını sağlar
             layoutId="progress"
           />
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 pt-24 scroll-smooth scrollbar-hide"
      >
        <motion.div
           key={article.id}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4 }}
           className="prose prose-invert prose-sm max-w-none"
        >
           <div 
             className="text-slate-300 leading-relaxed text-sm font-light tracking-wide"
             dangerouslySetInnerHTML={{ __html: article.content }} 
           />
           
           {/* Okuma bittiyse tebrik mesajı */}
           <div className="mt-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
              <p className="text-blue-200 text-xs font-bold">🎉 Okumayı Tamamladınız</p>
           </div>
           <div className="h-10"></div> {/* Alt boşluk */}
        </motion.div>
      </div>

      {/* 3. NEXT BUTTON (Floating) */}
      <div className="absolute bottom-4 right-4 z-20">
         <button 
           onClick={handleNext}
           className="group flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg hover:bg-blue-50 transition-all hover:scale-105"
         >
            Sıradaki <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
         </button>
      </div>

    </div>
  );
};