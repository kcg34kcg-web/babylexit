'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchContext } from '@/context/SearchContext';

// UI Bileşenleri
import AuroraBackground from './ui/AuroraBackground';
import PulseFooter from './ui/PulseFooter';

// Modüller (İçerik Kartları) - Bunları bir sonraki adımda (Phase 3) detaylandıracağız
// Şimdilik "Placeholder" (yer tutucu) olarak basit metinler koyacağız.
import { Brain, Quote, Wind, Gamepad2, FileText } from 'lucide-react';

export default function LoungeContainer() {
  const router = useRouter();
  
  // 1. Global Durumu Çek
  const { isReady, searchResult } = useSearchContext();
  
  // 2. Tab Yönetimi (Kullanıcı beklerken sekmeler arasında gezebilir)
  const [activeTab, setActiveTab] = useState<'trivia' | 'quote' | 'zen' | 'game' | 'read'>('trivia');

  // Sonuç Sayfasına Git
  const handleComplete = () => {
    if (searchResult?.questionId) {
      router.push(`/questions/${searchResult.questionId}`);
    } else {
        // Hata durumunda veya ID yoksa dashboard'a at
        router.push('/dashboard');
    }
  };

  return (
    <AuroraBackground>
      
      {/* --- ÜST KISIM: LOGO & NAVİGASYON --- */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Living Lounge
          </h1>
          <p className="text-indigo-300/60 text-xs font-medium tracking-widest uppercase">
            AI Analiz Merkezi
          </p>
        </div>

        {/* Tab Menüsü */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full backdrop-blur-md border border-white/10">
          <TabButton id="trivia" icon={Brain} active={activeTab} onClick={setActiveTab} />
          <TabButton id="quote" icon={Quote} active={activeTab} onClick={setActiveTab} />
          <TabButton id="zen" icon={Wind} active={activeTab} onClick={setActiveTab} />
          <TabButton id="read" icon={FileText} active={activeTab} onClick={setActiveTab} />
          <TabButton id="game" icon={Gamepad2} active={activeTab} onClick={setActiveTab} />
        </nav>
      </header>

      {/* --- ORTA KISIM: DEĞİŞEN İÇERİK (PHASE 3'TE BURAYI DOLDURACAĞIZ) --- */}
      <main className="flex-1 w-full relative flex flex-col items-center justify-center">
         <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="inline-flex p-4 rounded-3xl bg-white/5 border border-white/10 text-indigo-300">
               {activeTab === 'trivia' && <Brain size={48} />}
               {activeTab === 'quote' && <Quote size={48} />}
               {activeTab === 'zen' && <Wind size={48} />}
               {activeTab === 'read' && <FileText size={48} />}
               {activeTab === 'game' && <Gamepad2 size={48} />}
            </div>
            <h2 className="text-2xl font-bold text-white">Modül Yükleniyor...</h2>
            <p className="text-white/40 max-w-md mx-auto">
               (Phase 3'te buraya gerçek interaktif modülleri ekleyeceğiz. Şu an sadece altyapı hazır.)
            </p>
         </div>
      </main>

      {/* --- ALT KISIM: AKILLI FOOTER --- */}
      <PulseFooter isReady={isReady} onComplete={handleComplete} />

    </AuroraBackground>
  );
}

// Küçük Yardımcı Bileşen: Tab Butonu
function TabButton({ id, icon: Icon, active, onClick }: any) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`p-3 rounded-full transition-all duration-300 relative ${
        isActive ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-500/30' : 'text-white/40 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon size={20} />
      {isActive && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
      )}
    </button>
  );
}