'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, CheckCircle2, Sparkles, BrainCircuit, ArrowRight } from 'lucide-react';
import LoungeContainer from '@/components/lounge/LoungeContainer'; 

export default function LoungePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const supabase = createClient();

  // Durum Yönetimi
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'analyzing' | 'completed'>('analyzing');
  const [statusText, setStatusText] = useState('Vaka inceleniyor...');

  const goToResult = () => {
    if (id) router.push(`/questions/${id}`);
  };

  useEffect(() => {
    if (!id) return;

    // 1. GÖRSEL İLERLEME (90%'a kadar)
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
            if (status === 'analyzing') setStatusText('Sonuçlar toparlanıyor...');
            return prev;
        }
        // İlk %30 hızlı, sonrası yavaş (Psikolojik bekleme süresi)
        const increment = prev < 30 ? 2 : 0.5; 
        return Math.min(prev + increment, 90);
      });
    }, 100);

    // 2. VERİTABANI KONTROLÜ (Polling)
    const checkStatus = async () => {
      // Eğer zaten tamamlandıysa tekrar sorma
      if (status === 'completed') return;

      try {
        const { data, error } = await supabase
          .from('questions')
          .select('status')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data.status === 'answered') {
          setStatus('completed');
          setProgress(100);
          setStatusText('Analiz Hazır! Görüntüle');
          // OTOMATİK YÖNLENDİRME YOK! Sadece state değişti.
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    checkStatus();
    const poller = setInterval(checkStatus, 2000); // 2 saniyede bir sor

    // 3. GÜVENLİK (Timeout)
    // 25 saniye geçtiyse ve hala cevap yoksa bile "Hazır" de,
    // kullanıcı tıkladığında sayfaya gitsin (sayfa yüklenirken backend bitmiş olur).
    const timeoutFallback = setTimeout(() => {
       if (status !== 'completed') {
          setStatus('completed');
          setProgress(100);
          setStatusText('Analiz Hazırlandı');
       }
    }, 25000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(poller);
      clearTimeout(timeoutFallback);
    };
  }, [id, router, supabase, status]);

  return (
    <div className="relative min-h-screen">
      
      {/* 1. OYUN ALANI (Arka Plan) */}
      <div className="relative z-0">
         <LoungeContainer />
      </div>

      {/* 2. DURUM WIDGET'I (Sol Üst) */}
      <div className="fixed top-4 left-4 z-50 animate-in slide-in-from-left-5 duration-700 group">
        
        <button 
            onClick={status === 'completed' ? goToResult : undefined}
            disabled={status === 'analyzing'}
            className={`
                relative overflow-hidden
                backdrop-blur-md border 
                p-4 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[260px] text-left transition-all duration-300
                ${status === 'completed' 
                    ? 'bg-green-900/80 border-green-400/50 cursor-pointer hover:scale-105 hover:shadow-green-500/20 animate-pulse-slow' 
                    : 'bg-black/60 border-white/10 cursor-wait'}
            `}
        >
           {/* Yanıp Sönen Yeşil Glow Efekti (Sadece bittiğinde) */}
           {status === 'completed' && (
             <div className="absolute inset-0 bg-green-500/10 animate-pulse pointer-events-none"></div>
           )}

           {/* Başlık ve İkon */}
           <div className="flex items-center gap-3 relative z-10">
              {status === 'analyzing' ? (
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 animate-pulse"></div>
                    <BrainCircuit className="w-6 h-6 text-indigo-400 animate-pulse" />
                </div>
              ) : (
                <div className="bg-green-500 text-white p-1 rounded-full shadow-lg shadow-green-500/40 animate-bounce">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              
              <div className="flex flex-col">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${status === 'completed' ? 'text-green-300' : 'text-indigo-300'}`}>
                    Babylexit AI
                  </span>
                  <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white leading-tight">{statusText}</span>
                      {status === 'completed' && <ArrowRight size={14} className="text-white animate-wobble" />}
                  </div>
              </div>
           </div>

           {/* İlerleme Çubuğu */}
           <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden relative z-10">
              <div 
                className={`h-full transition-all duration-500 ease-out ${
                    status === 'completed' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
           </div>

           {/* Alt Bilgi */}
           <div className="flex justify-between items-center text-[10px] text-white/50 font-medium relative z-10">
              <span>{Math.round(progress)}%</span>
              <span className="flex items-center gap-1">
                 {status === 'completed' 
                    ? <span className="text-green-200 font-bold">Sonucu görmek için tıkla</span>
                    : <><Sparkles size={8} /> Beklerken keşfedin</>
                 }
              </span>
           </div>

        </button>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
          50% { transform: scale(1.02); box-shadow: 0 10px 25px -5px rgba(34, 197, 94, 0.4); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }
        @keyframes wobble {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(3px); }
        }
        .animate-wobble {
            animation: wobble 1s infinite ease-in-out;
        }
      `}</style>

    </div>
  );
}