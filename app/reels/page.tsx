'use client';

import { useState } from 'react';
import ReelsContainer from '@/components/reels/ReelsContainer';
import UploadVideoModal from '@/components/reels/UploadVideoModal';
import { ArrowLeft, Camera, Moon, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ReelsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#020204] text-white">
      
      {/* ==============================================
          1. ARKA PLAN KATMANI (AY & UZAY TEMASI) 
         ============================================== */}
         
      {/* Gerçekçi Ay Yüzeyi Görseli */}
      <div 
        className="absolute inset-0 z-0 opacity-80"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(100%) contrast(110%) brightness(80%)'
        }}
      />
      
      {/* Atmosferik Gradyan */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
      
      {/* Parlayan Yıldızlar */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-60 shadow-[0_0_10px_white]" />
      <div className="absolute bottom-1/3 right-10 w-1 h-1 bg-blue-200 rounded-full animate-pulse delay-700 opacity-40" />
      <div className="absolute top-10 right-20 animate-spin-slow opacity-30">
         <Sparkles size={20} className="text-white" />
      </div>


      {/* ==============================================
          2. ÜST KONTROLLER (HEADER & BUTONLAR) 
         ============================================== */}
      <div className="absolute top-0 left-0 w-full z-50 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        
        {/* ✅ DÜZELTME: Geri Dön Butonu -> Social Sayfasına */}
        <Link 
          href="/social" 
          className="pointer-events-auto p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/20 transition-all active:scale-95 group"
        >
          <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
        </Link>

        {/* Logo / Başlık */}
        <div className="flex flex-col items-center opacity-80">
            <span className="text-[10px] font-black tracking-[0.4em] text-slate-300 flex items-center gap-2 uppercase drop-shadow-lg">
                <Moon size={12} className="fill-slate-300" /> Moon Feed
            </span>
        </div>

        {/* Yükleme Butonu */}
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="pointer-events-auto p-3 bg-rose-600/90 backdrop-blur-xl border border-rose-500/50 rounded-full text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:bg-rose-600 hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] transition-all active:scale-95 group"
        >
          <Camera size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* ==============================================
          3. VİDEO AKIŞI (CAM KATMAN)
         ============================================== */}
      <div className="relative z-10 w-full h-full">
         <ReelsContainer />
      </div>

      {/* ==============================================
          4. YÜKLEME PENCERESİ (MODAL)
         ============================================== */}
      <UploadVideoModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />

    </main>
  );
}