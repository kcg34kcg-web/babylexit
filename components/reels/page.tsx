'use client';

import { useState } from 'react';
import ReelsContainer from '@/components/reels/ReelsContainer';
import UploadVideoModal from '@/components/reels/UploadVideoModal';
import { ArrowLeft, Camera, Moon, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ReelsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#050505] text-white">
      
      {/* --- 1. ARKA PLAN KATMANI (AY TEMASI) --- */}
      {/* Gerçekçi Ay Yüzeyi Görseli */}
      <div 
        className="absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Uzay Efekti (Gradyan) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
      
      {/* Dekoratif Yıldızlar/Parıltılar */}
      <div className="absolute top-10 right-20 animate-pulse opacity-50"><Sparkles size={14} className="text-blue-200" /></div>
      <div className="absolute bottom-40 left-10 animate-pulse opacity-30"><Sparkles size={10} className="text-white" /></div>


      {/* --- 2. ÜST KONTROLLER (HEADER) --- */}
      <div className="absolute top-0 left-0 w-full z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        
        {/* Geri Dön */}
        <Link 
          href="/" 
          className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition active:scale-95"
        >
          <ArrowLeft size={24} />
        </Link>

        {/* Başlık (İsteğe bağlı) */}
        <div className="flex flex-col items-center">
            <span className="text-xs font-bold tracking-[0.3em] text-slate-300 flex items-center gap-1">
                <Moon size={10} /> MOON FEED
            </span>
        </div>

        {/* Yükleme Butonu (Burada kesinlikle görünmeli) */}
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="p-3 bg-rose-600/90 backdrop-blur-md border border-rose-500/50 rounded-full text-white shadow-lg shadow-rose-900/50 hover:bg-rose-600 transition active:scale-95 group"
        >
          <Camera size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* --- 3. VİDEO AKIŞI (TRANSPARAN) --- */}
      <div className="relative z-10 w-full h-full">
         <ReelsContainer />
      </div>

      {/* --- 4. YÜKLEME MODALI --- */}
      <UploadVideoModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />

    </main>
  );
}